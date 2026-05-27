import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface RealTimeContextType {
  riderPresence: Record<string, "online" | "offline">;
  riderLocations: Record<string, { lat: number; lng: number; heading?: number; timestamp: number }>;
  lastSync: number | null;
  socket: Socket | null;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const token = (user as any)?.token;
  const [riderPresence, setRiderPresence] = useState<Record<string, "online" | "offline">>({});
  const [riderLocations, setRiderLocations] = useState<Record<string, { lat: number; lng: number; heading?: number; timestamp: number }>>({});
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setRiderPresence({});
      setRiderLocations({});
      return;
    }

    // Connect to Socket.io server
    const newSocket = io({
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log('🌐 RealTime: Connected to server');
      newSocket.emit("join", user.id);
      newSocket.emit("join-room", user.id);
      if (user.role === 'admin' || user.role === 'personnel') {
        newSocket.emit("join-room", "admin-room");
      }
      setLastSync(Date.now());
    });

    newSocket.on("presence-sync", (data: { onlineRiders: string[] }) => {
      console.log('🔄 RealTime: Received presence sync:', data.onlineRiders.length, 'riders online');
      setRiderPresence((prev) => {
        // Reset and rebuild presence based on fresh server data
        const newState: Record<string, "online" | "offline"> = {};
        
        // Mark everyone in the sync list as online
        data.onlineRiders.forEach((id) => {
          newState[id] = "online";
        });

        // For anyone who WAS online but isn't in the new list, mark as offline
        // (This handles the case where someone disconnected while we were offline)
        Object.keys(prev).forEach(id => {
          if (!newState[id]) newState[id] = "offline";
        });

        return newState;
      });
    });

    newSocket.on("rider-presence-changed", (data: { riderId: string; status: "online" | "offline" }) => {
      console.log(`👤 RealTime: Rider ${data.riderId} is now ${data.status}`);
      setRiderPresence((prev) => ({
        ...prev,
        [data.riderId]: data.status,
      }));
    });

    newSocket.on("rider-location-updated", (data: { riderId: string; lat: number; lng: number; heading?: number; timestamp: number }) => {
      setRiderLocations((prev) => ({
        ...prev,
        [data.riderId]: {
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
          timestamp: data.timestamp,
        },
      }));
      
      // Implicitly mark as online if we get a location update
      setRiderPresence((prev) => {
        if (prev[data.riderId] === "online") return prev;
        return { ...prev, [data.riderId]: "online" };
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.log('🌐 RealTime: Disconnected from server:', reason);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user, token]);

  return (
    <RealTimeContext.Provider value={{ riderPresence, riderLocations, lastSync, socket }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error("useRealTime must be used within a RealTimeProvider");
  }
  return context;
}
