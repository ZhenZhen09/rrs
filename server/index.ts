import './db'; // Force environment variables to load first
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
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
import { onlineRiders, updateRiderPresence, cleanupOfflineRiders } from './presence';
import { handleRiderLocationUpdate } from './locationTracking';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Standard Security Practice: Use Helmet to set secure HTTP headers (CSP, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid breaking Leaflet/External maps
  crossOriginEmbedderPolicy: false
}));

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

// Standard Security Practice: Rate limiting for Authentication routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/signup', authRateLimiter);
app.use('/api/auth/mfa', authRateLimiter);

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

// Standard Security Practice: Socket.io Auth Middleware (The Bouncer)
io.use((socket: any, next) => {
  const token = socket.handshake.auth.token || 
                (socket.handshake.headers.cookie ? 
                  socket.handshake.headers.cookie.split('; ').find((row: any) => row.startsWith('authToken='))?.split('=')[1] 
                  : null);

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    socket.user = decoded; // Store decoded user for room authorization
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
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
  start() { 
    console.log('🛡️ Watchdog: Starting with 30s interval');
    setInterval(() => this.check(), 30000); 
  }

  async check() {
    cleanupOfflineRiders(this.io);
    const now = Date.now();
    console.log(`🔍 Watchdog: Checking state at ${new Date(now).toISOString()}`);
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
            "UPDATE delivery_requests SET status = 'pending' WHERE request_id = ? AND status = 'submitted_waiting'",
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
        `SELECT request_id, assigned_rider_id, delivery_status, current_lat, current_lng, updated_at
         FROM delivery_requests
         WHERE status = 'approved' AND delivery_status NOT IN ('completed', 'failed', 'disapproved')`
      );
      const activeRequests = rows as any[];

      for (const req of activeRequests) {
        const state = requestPingState.get(req.request_id);
        const currentExceptions = new Set<string>();
        const isOnline = onlineRiders.has(req.assigned_rider_id);

        const timeSinceUpdate = now - new Date(req.updated_at).getTime();
        const gracePeriod = 120000; // 2 minutes

        // Logic: signal is lost if rider is not in onlineRiders Map
        // AND grace period has passed
        // OR if state exists but lastPing (from location update) is > 5 minutes old
        if (req.assigned_rider_id && !isOnline && timeSinceUpdate > gracePeriod) {
          currentExceptions.add('signal_lost');
        } else if (state && (now - state.lastPing > 300000)) {
          currentExceptions.add('signal_lost');
        }
        const stateWithExceptions = state || { exceptions: new Set() };
        const oldExceptionsList = Array.from(stateWithExceptions.exceptions).sort();
        const oldExceptionsStr = oldExceptionsList.join(',');
        const newExceptionsList = Array.from(currentExceptions).sort();
        const newExceptionsStr = newExceptionsList.join(',');

        if (newExceptionsStr !== oldExceptionsStr) {
          console.log(`⚠️ Watchdog: Exception change for ${req.request_id}: [${oldExceptionsStr}] -> [${newExceptionsStr}]`);
          
          if (state) {
            state.exceptions = currentExceptions as any;
          } else {
            requestPingState.set(req.request_id, { 
              lastPing: now, 
              lastLat: Number(req.current_lat || 0), 
              lastLng: Number(req.current_lng || 0), 
              stagnantSince: null, 
              exceptions: currentExceptions as any 
            });
          }
          
          await pool.execute('UPDATE delivery_requests SET exceptions = ? WHERE request_id = ?', [JSON.stringify(newExceptionsList), req.request_id]);
          
          const event = newExceptionsList.length > 0 ? 'exception-detected' : 'exception-cleared';
          this.io.emit(event, { requestId: req.request_id, exceptions: newExceptionsList });
        }
      }
    } catch (err) {
      console.error('❌ Watchdog Error:', err);
    }
  }
}

io.on('connection', (socket: any) => {
  let sessionRiderId: string | null = null;

  socket.on('join-room', (room: string) => { 
    // Standard Security Practice: Enforce room authorization
    if (room === 'admin-room' && socket.user.role !== 'admin') {
      console.warn(`🛑 Unauthorized room join attempt by ${socket.user.id} to ${room}`);
      return;
    }
    socket.join(room); 
  });

  socket.on('join', (userID: string) => {
    // Standard Security Practice: Prevent rider from spoofing another user's room
    if (userID !== socket.user.id && socket.user.role !== 'admin') {
      console.warn(`🛑 Unauthorized join attempt by ${socket.user.id} as ${userID}`);
      return;
    }
    
    if (userID) {
      socket.join(userID);
      sessionRiderId = userID;
      updateRiderPresence(userID, socket.id, io as any);
      watchdog.check();
    }
  });

  socket.on('update-location', async (data: any) => {
    const { requestId, lat, lng, riderId, heading } = data;
    if (lat === undefined || lng === undefined || !riderId) return;

    // Standard Security Practice: Prevent rider from spoofing location for another rider
    if (riderId !== socket.user.id) {
      console.warn(`🛑 Location spoofing attempt detected from ${socket.user.id} for rider ${riderId}`);
      return;
    }

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
