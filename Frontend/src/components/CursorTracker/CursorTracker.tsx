import { useEffect, useState } from "react";
import "./CursorTracker.css";
import { useSocket } from "../../context/SocketProvider";

interface CursorData {
  user: string;
  x: number;
  y: number;
}

export const CursorTracker = () => {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const username = localStorage.getItem("username") || "";
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSocketMessage = async (event: MessageEvent) => {
      try {
        let textData;
        if (event.data instanceof Blob) {
          textData = await event.data.text();
        } else {
          textData = event.data;
        }

        const data = JSON.parse(textData);

        if (data.type === "cursor") {
          if (data.user !== username) {  
            setCursors((prev) => ({
                ...prev,
                [data.user]: { user: data.user, x: data.x, y: data.y },
            }));
          }
        }else if (data.type === "userLeft") {
          setCursors((prev) => {
              const updatedCursors = { ...prev };
              delete updatedCursors[data.userId]; // Remove user's cursor
              return updatedCursors;
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleSocketMessage);

    return () => {
      socket.removeEventListener("message", handleSocketMessage);
    };
  }, [socket]);

  // Function to send cursor data
  const sendCursorData = (x: number, y: number) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(
      JSON.stringify({
        type: "cursor",
        user: username,
        x,
        y,
      })
    );
  };

  // Handle Mouse Move & Send Cursor Data
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      sendCursorData(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [socket]);

  // Re-send cursor data after reconnecting
  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      console.log("WebSocket reconnected, resending cursor data...");
      const x = window.innerWidth / 2; // Default x position
      const y = window.innerHeight / 2; // Default y position
      sendCursorData(x, y);
    };

    socket.addEventListener("open", handleReconnect);

    return () => {
      socket.removeEventListener("open", handleReconnect);
    };
  }, [socket]);

  console.log(cursors);

  return (
    <>
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.user}
          className="cursor"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <span className="cursor-name">{cursor.user}</span>
          <div className="cursor-dot"></div>
        </div>
      ))}
    </>
  );
};
