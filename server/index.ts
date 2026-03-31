import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  // --- CARRIER-GRADE HEARTBEATS ---
  pingTimeout: 60000,   // Wait 60s for pong before declaring disconnect
  pingInterval: 10000,  // Ping every 10s to keep carrier NAT tunnels alive
  connectTimeout: 45000,
  transports: ['websocket', 'polling'], // Fallback if WebSocket is blocked
  allowUpgrades: true
});

app.use(cors());
app.use(express.json());

// Health Check / Wake-up Endpoint
app.get('/api/ping', (req, res) => {
  // We add a 10-second timeout to give Render more time to boot up
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply aggressive No-Cache headers to all API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Helper to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dP = (lat2 - lat1) * Math.PI / 180;
  const dL = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dP/2) * Math.sin(dP/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dL/2) * Math.sin(dL/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// In-memory state for optimizing database writes
interface LocationState {
  lat: number;
  lng: number;
  lastLogTime: number;
}
const riderLocationState = new Map<string, LocationState>();

// Time threshold for logging to DB (e.g., 60 seconds)
const DB_LOG_INTERVAL_MS = 60000;
// Distance threshold for logging to DB (e.g., 50 meters)
const DB_LOG_DISTANCE_M = 50;
// Geofence radius for automated status triggers
const GEOFENCE_RADIUS_M = 200;

// --- MANAGEMENT BY EXCEPTION (MBE) ENGINE ---
interface RequestPingState {
  lastPing: number;
  lastLat: number;
  lastLng: number;
  stagnantSince: number | null;
  exceptions: Set<'signal_lost' | 'stagnant' | 'delayed'>;
}
const requestPingState = new Map<string, RequestPingState>();

class RequestWatchdog {
  private interval: NodeJS.Timeout | null = null;
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  start() {
    console.log('🚀 MBE Watchdog started');
    this.interval = setInterval(() => this.check(), 60000); // Check every minute
  }

  async check() {
    const now = Date.now();
    const SIGNAL_LOST_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const STAGNANT_THRESHOLD = 10 * 60 * 1000;  // 10 minutes

    try {
      // Get all active (approved but not terminal) requests
      const [rows] = await pool.execute(
        `SELECT request_id, assigned_rider_id, delivery_status, current_lat, current_lng 
         FROM delivery_requests 
         WHERE status = 'approved' AND delivery_status NOT IN ('completed', 'failed', 'disapproved')`
      );
      const activeRequests = rows as any[];

      for (const req of activeRequests) {
        const state = requestPingState.get(req.request_id);
        const currentExceptions = new Set<string>();

        if (!state) {
          // If no state yet and request is in progress, it might already be "lost" if it was approved long ago
          continue; 
        }

        // 1. Check Signal Loss
        if (now - state.lastPing > SIGNAL_LOST_THRESHOLD) {
          currentExceptions.add('signal_lost');
        }

        // 2. Check Stagnation (Rider is in_progress but not moving)
        if (req.delivery_status === 'in_progress' || req.delivery_status === 'in_transit') {
          const distance = getDistance(state.lastLat, state.lastLng, Number(req.current_lat || 0), Number(req.current_lng || 0));
          
          if (distance < 20) { // Less than 20m movement
            if (!state.stagnantSince) {
              state.stagnantSince = now;
            } else if (now - state.stagnantSince > STAGNANT_THRESHOLD) {
              currentExceptions.add('stagnant');
            }
          } else {
            state.stagnantSince = null;
            state.lastLat = Number(req.current_lat);
            state.lastLng = Number(req.current_lng);
          }
        }

        // 3. Emit if exceptions changed or exist
        const oldExceptions = Array.from(state.exceptions).sort().join(',');
        const newExceptionsList = Array.from(currentExceptions).sort();
        const newExceptionsStr = newExceptionsList.join(',');

        if (newExceptionsStr !== oldExceptions) {
          state.exceptions = currentExceptions as any;
          if (newExceptionsList.length > 0) {
            const severity = currentExceptions.has('signal_lost') ? 'critical' : 'warning';
            console.log(`⚠️ Exception detected for ${req.request_id}: ${newExceptionsStr}`);
            
            // Persist to DB
            await pool.execute(
              'UPDATE delivery_requests SET exceptions = ?, exception_severity = ? WHERE request_id = ?',
              [JSON.stringify(newExceptionsList), severity, req.request_id]
            );

            this.io.emit('exception-detected', {
              requestId: req.request_id,
              exceptions: newExceptionsList,
              severity: severity
            });
          } else {
            console.log(`✅ Exception cleared for ${req.request_id}`);
            
            // Clear from DB
            await pool.execute(
              'UPDATE delivery_requests SET exceptions = NULL, exception_severity = NULL WHERE request_id = ?',
              [req.request_id]
            );

            this.io.emit('exception-cleared', { requestId: req.request_id });
          }
        }
      }
    } catch (err) {
      console.error('Watchdog check failed:', err);
    }
  }
}

// Socket.io logic for real-time tracking
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Support for Web-app "join-room"
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    
    // MBE Sync: Send current active exceptions to the newly joined admin
    if (room === 'admin-room') {
      const activeExceptions = Array.from(requestPingState.entries())
        .filter(([id, state]) => state.exceptions.size > 0)
        .map(([id, state]) => ({
          requestId: id,
          exceptions: Array.from(state.exceptions),
          severity: state.exceptions.has('signal_lost') ? 'critical' : 'warning'
        }));
      
      if (activeExceptions.length > 0) {
        socket.emit('mbe-sync', activeExceptions);
      }
    }
  });

  // Support for Mobile-app "join" (for rider-specific updates)
  socket.on('join',(userID) => {
    if (userID){
      socket.join(userID);
      console.log(`Rider ${userID} joined personal room`); 
    }
  });

  // Support for specific job synchronization
  socket.on('join-job-room', (requestId) => {
    if (requestId) {
      socket.join(`job_${requestId}`);
      console.log(`Socket ${socket.id} joined job room: job_${requestId}`);
    }
  });

  socket.on('update-location', async (data) => {
    // data: { riderId, lat, lng, requestId }
    const { requestId, lat, lng, riderId } = data;
    
    // Broadcast to all (Admin map movement)
    io.emit('rider-location-updated', data);

    if (!requestId || !lat || !lng || !riderId) return;

    // MBE Update: Heartbeat tracking
    const existingState = requestPingState.get(requestId);
    if (!existingState) {
      requestPingState.set(requestId, {
        lastPing: Date.now(),
        lastLat: lat,
        lastLng: lng,
        stagnantSince: null,
        exceptions: new Set()
      });
    } else {
      const wasSignalLost = existingState.exceptions.has('signal_lost');
      existingState.lastPing = Date.now();
      
      // PROACTIVE CLEARING: If we had a signal_lost exception, clear it immediately
      if (wasSignalLost) {
        existingState.exceptions.delete('signal_lost');
        const remainingExceptions = Array.from(existingState.exceptions);
        
        console.log(`📡 Signal recovered for ${requestId}. Clearing exception immediately.`);
        
        // Update DB instantly
        const exceptionsJson = remainingExceptions.length > 0 ? JSON.stringify(remainingExceptions) : null;
        const severity = remainingExceptions.includes('stagnant') ? 'warning' : null;
        
        pool.execute(
          'UPDATE delivery_requests SET exceptions = ?, exception_severity = ? WHERE request_id = ?',
          [exceptionsJson, severity, requestId]
        ).catch(err => console.error('Error clearing signal_lost proactively:', err));

        // Notify Admin UI instantly
        if (remainingExceptions.length === 0) {
          io.emit('exception-cleared', { requestId });
        } else {
          io.emit('exception-detected', {
            requestId,
            exceptions: remainingExceptions,
            severity
          });
        }
      }

      // Only update movement baseline if moved significantly to avoid clearing stagnation by GPS noise
      const dist = getDistance(existingState.lastLat, existingState.lastLng, lat, lng);
      if (dist > 10) {
        existingState.lastLat = lat;
        existingState.lastLng = lng;
        existingState.stagnantSince = null;
      }
    }

    try {
      const now = Date.now();
      const stateKey = `${requestId}_${riderId}`;
      let state = riderLocationState.get(stateKey);
      let shouldLogToDB = false;


      // --- GEOFENCING LOGIC ---
      // Fetch request details to get dropoff coordinates and current status
      const [rows] = await pool.execute(
        'SELECT dropoff_lat, dropoff_lng, delivery_status FROM delivery_requests WHERE request_id = ?',
        [requestId]
      );
      const request = (rows as any[])[0];

      if (request && request.delivery_status === 'in_progress') {
        const distanceToDropoff = getDistance(lat, lng, Number(request.dropoff_lat), Number(request.dropoff_lng));
        
        if (distanceToDropoff <= GEOFENCE_RADIUS_M) {
          console.log(`🎯 Geofence Triggered: Rider ${riderId} arrived at destination for Request ${requestId}`);
          
          // 1. Update status in database
          await pool.execute(
            'UPDATE delivery_requests SET delivery_status = ? WHERE request_id = ?',
            ['arrived', requestId]
          );

          // 2. Log status change
          await pool.execute(
            'INSERT INTO status_logs (request_id, rider_id, status, remark) VALUES (?, ?, ?, ?)',
            [requestId, riderId, 'arrived', `Automated Geofence: Rider within ${GEOFENCE_RADIUS_M}m of destination`]
          );

          // 3. Emit real-time status update to all clients
          io.emit('delivery-status-updated', { 
            requestId, 
            status: 'arrived', 
            remark: 'Automated: Rider Arrived' 
          });

          // 4. Sync with specific job room (Mobile app)
          io.to(`job_${requestId}`).emit('job-status-changed', {
            requestId,
            status: 'arrived',
            updatedBy: 'system',
            message: 'Rider has arrived at the destination.'
          });
        }
      }
      // --- END GEOFENCING LOGIC ---

      if (!state) {
        shouldLogToDB = true;
      } else {
        const timeElapsed = now - state.lastLogTime;
        const distanceMoved = getDistance(state.lat, state.lng, lat, lng);

        // Log every 60s or if moved 50m
        if ((timeElapsed >= DB_LOG_INTERVAL_MS && distanceMoved > 10) || distanceMoved >= DB_LOG_DISTANCE_M) {
          shouldLogToDB = true;
        }
      }

      if (shouldLogToDB) {
        await pool.execute(
          'INSERT INTO location_logs (request_id, rider_id, lat, lng) VALUES (?, ?, ?, ?)',
          [requestId, riderId, lat, lng]
        );
        await pool.execute(
          'UPDATE delivery_requests SET current_lat = ?, current_lng = ? WHERE request_id = ?',
          [lat, lng, requestId]
        );

        // Update in-memory state
        riderLocationState.set(stateKey, { lat, lng, lastLogTime: now });
      }

    } catch (err) {
      console.error('Error in location update / geofencing:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass io to routes so they can emit events
app.set('io', io);

// Mount the modular routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Initialize MBE Watchdog
const watchdog = new RequestWatchdog(io);
watchdog.start();

// Serve static files from the React app
// SMART PATH: Checks if we are running from 'server/index.ts' or 'server/dist/index.js'
const isProduction = __dirname.includes('dist');
const distPath = isProduction 
  ? path.join(__dirname, '../../dist') // From server/dist to project-root/dist
  : path.join(__dirname, '../dist');    // From server/ to project-root/dist

// Serve static assets (JS, CSS, images) with long cache times since Vite hashes them
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // NEVER cache HTML files
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else if (filePath.includes('/assets/')) {
      // Cache assets for 1 year
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// The "catchall" handler
app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    // ALWAYS force the browser to fetch the freshest index.html
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found. Please run "npm run build" in the root directory.');
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server with Socket.io running on port ${PORT}`);
});
