import { Server } from 'socket.io';

export const onlineRiders = new Map<string, { socketId: string, lastSeen: number }>();

export const cleanupOfflineRiders = (io?: Server | null) => {
  const now = Date.now();
  const TTL = 300000; // 5 minutes

  for (const [riderId, data] of onlineRiders.entries()) {
    if (now - data.lastSeen > TTL) {
      onlineRiders.delete(riderId);
      if (io) {
        io.to('admin-room').emit('rider-presence-changed', {
          riderId,
          status: 'offline',
          lastSeen: data.lastSeen
        });
      }
    }
  }
};

export const updateRiderPresence = (riderId: string, socketId: string = 'rest-api', io: Server | null = null) => {
  const now = Date.now();
  onlineRiders.set(riderId, { socketId, lastSeen: now });
  
  if (io) {
    io.to('admin-room').emit('rider-presence-changed', {
      riderId,
      status: 'online',
      lastSeen: now
    });
  }
};
