import { Server } from 'socket.io';
import { pool } from './db';

export const onlineRiders = new Map<string, { socketId: string, lastSeen: number }>();

export const cleanupOfflineRiders = async (io?: Server | null) => {
  const now = Date.now();
  const TTL = 900000; // 15 minutes (Increased from 5m for better idle handling)

  for (const [riderId, data] of onlineRiders.entries()) {
    if (now - data.lastSeen > TTL) {
      onlineRiders.delete(riderId);
      
      if (io) {
        // 1. Broadcast to global admin room
        io.to('admin-room').emit('rider-presence-changed', {
          riderId,
          status: 'offline',
          lastSeen: data.lastSeen
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
              lastSeen: data.lastSeen
            });
          });
        } catch (e) {
          console.error(`[Presence] Failed to find active jobs for broadcast:`, e);
        }
      }
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
