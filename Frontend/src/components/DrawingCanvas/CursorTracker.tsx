import { useEffect, useState } from "react";
import "./CursorTracker.css";

interface CursorData {
  user: string;
  x: number;
  y: number;
}

interface CursorTrackerProps {
  socket: WebSocket;
  username: string;
}

export const CursorTracker = ({ socket, username }: CursorTrackerProps) => {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});

  useEffect(() => {
    const handleSocketMessage = async (event: MessageEvent) => {
      let textData;

      if (event.data instanceof Blob) {
        textData = await event.data.text();
      } else {
        textData = event.data;
      }

      const data = JSON.parse(textData);
      if (data.type === "cursor") {
        setCursors((prev) => ({
          ...prev,
          [data.user]: { user: data.user, x: data.x, y: data.y },
        }));
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => {
      socket.removeEventListener("message", handleSocketMessage);
    };
  }, [socket]);

  const handleMouseMove = (e: MouseEvent) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "cursor",
          user: username,
          x: e.clientX,
          y: e.clientY,
        })
      );
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

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
