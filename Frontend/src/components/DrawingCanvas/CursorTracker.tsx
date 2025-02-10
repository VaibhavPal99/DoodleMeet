import { useEffect, useState } from "react";
import "./CursorTracker.css";

import { useRecoilValue } from "recoil";
import { usernameAtom } from "../../atoms/usernameAtom";
import { useSocket } from "../../context/SocketProvider";

interface CursorData {
  user: string;
  x: number;
  y: number;
}



export const CursorTracker = () => {
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const username = useRecoilValue(usernameAtom);
  const {socket} = useSocket();
  console.log(username);

  useEffect(() => {
    if(!socket) return;
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

    if(!socket) return;

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
