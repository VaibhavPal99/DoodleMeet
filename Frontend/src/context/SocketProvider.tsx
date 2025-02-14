import React, { createContext, useContext, useEffect, useState } from "react";

interface SocketContextType {
  socket: WebSocket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      ws = new WebSocket("wss://duddlemeet.onrender.com")
      setSocket(ws);

      ws.onopen = () => {
        console.log("Connected to WebSocket");

        // If a roomId exists, rejoin the room on refresh
        const storedRoomId = localStorage.getItem("roomId");
        if (storedRoomId) {
          ws!.send(JSON.stringify({ type: "joinRoom", roomId: storedRoomId }));
          console.log(`Rejoining room: ${storedRoomId}`);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, attempting to reconnect...");
        setTimeout(connectWebSocket, 2000); // Auto-reconnect after 2 seconds
      };
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
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
