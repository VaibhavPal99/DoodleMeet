import { useEffect, useState } from "react";
import { DrawingCanvas } from "./DrawingCanvas";

export const Home = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [roomId, setRoomId] = useState("");
    const [userName, setUserName] = useState("");

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080"); // Adjust WebSocket URL if needed

        ws.onopen = () => {
            console.log("WebSocket connection established");
            setSocket(ws);
        };

        ws.onmessage = async (event) => {
            try {
                let textData;
                if (event.data instanceof Blob) {
                    textData = await event.data.text();
                } else {
                    textData = event.data;
                }
                
                const data = JSON.parse(textData);
                console.log("Data", data);
                if (data.type === "roomCreated") {
                    setRoomId(data.roomId); 
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };

        return () => {
            ws.close();
        };
    }, []);

    const handleCreateRoom = () => {
        if (!socket) return;
        socket.send(JSON.stringify({ type: "createRoom"}));
    };

    const handleJoinRoom = () => {
        if (!socket || !roomId) {
            console.log("No socket connection or no roomId");
            return;
        }
        socket.send(JSON.stringify({ type: "joinRoom", roomId}));
    };

    return (
        <div>
            <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter Your Name"
            />
            <button onClick={handleCreateRoom}>Create Room</button>
            
            <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
            />
            <button onClick={handleJoinRoom}>Join Room</button>

            {socket && roomId && <DrawingCanvas socket={socket} />}
        </div>
    );
};
