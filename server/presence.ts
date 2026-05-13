import { Server } from 'socket.io';

export const onlineRiders = new Map<string, { socketId: string, lastSeen: number }>();

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
