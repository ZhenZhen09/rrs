import './db'; // Force environment variables to load first
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import analyticsRoutes from './routes/analytics';
import { pool } from './db';
import { authenticate } from './middleware/auth';
import { onlineRiders, updateRiderPresence } from './presence';
import { handleRiderLocationUpdate } from './locationTracking';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins for easier mobile/emulator debugging
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 10000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

interface RequestPingState {
  lastPing: number; lastLat: number; lastLng: number; stagnantSince: number | null;
  exceptions: Set<'signal_lost' | 'stagnant' | 'delayed'>;
}
const requestPingState = new Map<string, RequestPingState>();

const DISCONNECT_GRACE_PERIOD = 90000; 

class RequestWatchdog {
  private io: Server;
  constructor(io: Server) { this.io = io; }
  start() { setInterval(() => this.check(), 60000); }

  async check() {
    const now = Date.now();
    try {
      // --- TASK 1: TRANSITION STUCK "QUEUEING" REQUESTS ---
      // Transition requests from 'submitted_waiting' to 'pending' if they are older than 60 seconds
      const [stuckRequests] = await pool.execute(
        `SELECT request_id, requester_id, requester_name, requester_department 
         FROM delivery_requests 
         WHERE status = 'submitted_waiting' 
         AND created_at <= (NOW() - INTERVAL 60 SECOND)`
      );
      
      const stRequests = stuckRequests as any[];
      if (stRequests.length > 0) {
        console.log(`🧹 Watchdog: Transitioning ${stRequests.length} stuck requests to pending`);
        
        for (const req of stRequests) {
          await pool.execute(
            "UPDATE delivery_requests SET status = 'pending' WHERE request_id = ?",
            [req.request_id]
          );

          // Notify admins
          const [admins] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
          const notifMessage = `New request from ${req.requester_name} (${req.requester_department})`;
          
          for (const admin of admins) {
            const notifId = `notif_${Date.now()}_wd_${Math.random().toString(36).substring(2, 7)}`;
            await pool.query(
              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
              [notifId, admin.id, notifMessage, 'request_submitted', req.request_id]
            );
            this.io.to(admin.id).emit('notification-added', { 
              id: notifId, message: notifMessage, type: 'request_submitted', request_id: req.request_id 
            });
          }
          
          // Emit update to everyone
          this.io.emit('request-updated', { request_id: req.request_id, status: 'pending' });
        }
      }

      // --- TASK 2: MONITOR ACTIVE SHIPMENTS ---
      const [rows] = await pool.execute(
        `SELECT request_id, assigned_rider_id, delivery_status, current_lat, current_lng 
         FROM delivery_requests 
         WHERE status = 'approved' AND delivery_status NOT IN ('completed', 'failed', 'disapproved')`
      );
      const activeRequests = rows as any[];

      for (const req of activeRequests) {
        const state = requestPingState.get(req.request_id);
        const currentExceptions = new Set<string>();
        const isOnline = onlineRiders.has(req.assigned_rider_id);

        if (!state) {
          if (!isOnline && req.assigned_rider_id) currentExceptions.add('signal_lost');
        } else {
          if (!isOnline || (now - state.lastPing > 300000)) currentExceptions.add('signal_lost');
        }

        const stateWithExceptions = state || { exceptions: new Set() };
        const oldExceptions = Array.from(stateWithExceptions.exceptions).sort().join(',');
        const newExceptionsList = Array.from(currentExceptions).sort();
        if (newExceptionsList.join(',') !== oldExceptions) {
          if (state) state.exceptions = currentExceptions as any;
          else requestPingState.set(req.request_id, { lastPing: now, lastLat: Number(req.current_lat || 0), lastLng: Number(req.current_lng || 0), stagnantSince: null, exceptions: currentExceptions as any });
          
          await pool.execute('UPDATE delivery_requests SET exceptions = ? WHERE request_id = ?', [JSON.stringify(newExceptionsList), req.request_id]);
          this.io.emit(newExceptionsList.length > 0 ? 'exception-detected' : 'exception-cleared', { requestId: req.request_id, exceptions: newExceptionsList });
        }
      }
    } catch (err) {}
  }
}

io.on('connection', (socket) => {
  let sessionRiderId: string | null = null;
  socket.on('join-room', (room) => { socket.join(room); });
  socket.on('join', (userID) => {
    if (userID) {
      socket.join(userID);
      sessionRiderId = userID;
      updateRiderPresence(userID, socket.id, io as any);
      watchdog.check();
    }
  });

  socket.on('update-location', async (data) => {
    const { requestId, lat, lng, riderId, heading } = data;
    if (lat === undefined || lng === undefined || !riderId) return;

    try {
      await handleRiderLocationUpdate({
        riderId,
        requestId,
        lat,
        lng,
        heading,
        riderName: data.riderName || 'Rider',
        verifyAssignment: true,
        io,
        requestPingState,
      });
    } catch (err) {
      console.error('Socket location update failed:', err);
    }
  });

  socket.on('disconnect', () => {
    if (sessionRiderId) {
      const rid = sessionRiderId;
      setTimeout(() => {
        const currentData = onlineRiders.get(rid);
        if (currentData && currentData.socketId === socket.id) {
          onlineRiders.delete(rid);
          io.to('admin-room').emit('rider-presence-changed', { riderId: rid, status: 'offline' });
        }
      }, DISCONNECT_GRACE_PERIOD);
    }
  });
});

app.set('io', io);
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/requests', authenticate, requestRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);

const clientDistPath = path.resolve(__dirname, '..', '..', 'dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)).*/, (req, res) => {
    res.sendFile(clientIndexPath);
  });
} else {
  console.warn(`Frontend build not found at ${clientDistPath}; serving API only.`);
}

const watchdog = new RequestWatchdog(io);
watchdog.start();

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server LIVE on port ${PORT}`);
});
