import React, { createContext, useContext, useEffect, useState } from "react";

interface SocketContextType {
  socket: WebSocket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080"); // Replace with your WebSocket URL
    setSocket(ws);

    ws.onopen = () => console.log("Connected to WebSocket");
    ws.onclose = () => console.log("WebSocket disconnected");

    return () => {
      ws.close();
    };
  }, []);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
