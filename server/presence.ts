import { Server } from 'socket.io';
import { pool } from './db';

export const onlineRiders = new Map<string, { socketId: string, lastSeen: number }>();

export const cleanupOfflineRiders = async (io?: Server | null) => {
  const now = Date.now();
  const TTL = 120000; // 2 minutes (Reduced from 15m for tighter real-time accuracy)

  for (const [riderId, data] of onlineRiders.entries()) {
    if (now - data.lastSeen > TTL) {
      await removeRiderPresence(riderId, io);
    }
  }
};

export const removeRiderPresence = async (riderId: string, io?: Server | null) => {
  if (!onlineRiders.has(riderId)) return;
  
  const lastSeen = onlineRiders.get(riderId)?.lastSeen || Date.now();
  onlineRiders.delete(riderId);
  
  if (io) {
    // 1. Broadcast to global admin room
    io.to('admin-room').emit('rider-presence-changed', {
      riderId,
      status: 'offline',
      lastSeen
    });

    // 2. TARGETED BROADCAST: Find any active jobs for this rider and notify those specific rooms
    try {
      const [activeJobs]: any = await pool.query(
        "SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled')",
        [riderId]
      );
      (activeJobs || []).forEach((job: any) => {
        io.to(`job_${job.request_id}`).emit('rider-presence-changed', {
          riderId,
          status: 'offline',
          lastSeen
        });
      });
    } catch (e) {
      console.error(`[Presence] Failed to find active jobs for offline broadcast:`, e);
    }
  }
};

export const updateRiderPresence = async (riderId: string, socketId: string = 'rest-api', io: Server | null = null) => {
  const now = Date.now();
  const wasOnline = onlineRiders.has(riderId);

  onlineRiders.set(riderId, { socketId, lastSeen: now });
  
  if (io) {
    // ENTERPRISE BROADCAST: Always emit pulse to keep UI clocks fresh
    // 1. Broadcast to global admin room
    io.to('admin-room').emit('rider-presence-changed', {
      riderId,
      status: 'online',
      lastSeen: now
    });

    // 2. TARGETED BROADCAST: Notify any active job rooms (only if first time online to reduce noise, or always for pulse?)
    // Decision: Only broadcast to global admin-room for the 'pulse'. 
    // Targeted job rooms can still rely on the 'wasOnline' check to reduce redundant packet overhead.
    if (!wasOnline) {
      try {
        const [activeJobs]: any = await pool.query(
          "SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed', 'failed', 'cancelled')",
          [riderId]
        );
        (activeJobs || []).forEach((job: any) => {
          io.to(`job_${job.request_id}`).emit('rider-presence-changed', {
            riderId,
            status: 'online',
            lastSeen: now
          });
        });
      } catch (e) {
        console.error(`[Presence] Failed to notify job rooms:`, e);
      }
    }
  }
};

export const touchRiderPresence = (riderId: string, socketId: string = 'rest-api', io: Server | null = null) => {
  updateRiderPresence(riderId, socketId, io);
};
