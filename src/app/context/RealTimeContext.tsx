import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface RealTimeContextType {
  riderPresence: Record<string, "online" | "offline">;
  riderLocations: Record<
    string,
    { lat: number; lng: number; name: string; lastUpdate: Date }
  >;
  socket: Socket | null;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [riderPresence, setRiderPresence] = useState<Record<string, "online" | "offline">>({});
  const [riderLocations, setRiderLocations] = useState<Record<string, { lat: number; lng: number; name: string; lastUpdate: Date }>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io();
      const socket = socketRef.current;

      socket.on("connect", () => {
        socket.emit("join-room", user.id);
        socket.emit("join-room", "admin-room");
      });

      socket.on("presence-sync", (data: { onlineRiders: string[] }) => {
        setRiderPresence((prev) => {
          const newState = { ...prev };
          data.onlineRiders.forEach((id) => {
            newState[id] = "online";
          });
          return newState;
        });
      });

      socket.on("rider-presence-changed", (data: { riderId: string; status: "online" | "offline" }) => {
        setRiderPresence((prev) => ({ ...prev, [data.riderId]: data.status }));
      });

      socket.on("rider-location-updated", (data: {
        requestId: string;
        lat: number;
        lng: number;
        riderId: string;
        riderName: string;
      }) => {
        if (data.riderId) {
          setRiderLocations((prev) => ({
            ...prev,
            [data.riderId]: {
              lat: data.lat,
              lng: data.lng,
              name: data.riderName || "Rider",
              lastUpdate: new Date(),
            },
          }));
        }
      });
    }

    return () => {
      // We don't necessarily want to disconnect on every re-render, 
      // but the dependency on user.id handles login/logout.
    };
  }, [user?.id]);

  return (
    <RealTimeContext.Provider value={{ riderPresence, riderLocations, socket: socketRef.current }}>
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
