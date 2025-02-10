import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketProvider"; // Updated import
import { useRecoilState } from "recoil";
import { usernameAtom } from "../../atoms/usernameAtom";

export const Home = () => {
    const { socket } = useSocket(); // Get WebSocket from context
    const [roomId, setRoomId] = useState("");
    const [userName, setUserName] = useRecoilState(usernameAtom);
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) return;

        socket.onmessage = async (event) => {
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
                    navigate(`/room/${data.roomId}`);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        return () => {
            socket.onmessage = null; // Cleanup event listener
        };
    }, [socket]);

    const handleCreateRoom = () => {
        if (!socket) return;
        socket.send(JSON.stringify({ type: "createRoom" }));
    };

    const handleJoinRoom = () => {
        if (!socket || !roomId) {
            console.log("No socket connection or no roomId");
            return;
        }
        socket.send(JSON.stringify({ type: "joinRoom", roomId }));
        navigate(`/room/${roomId}`);
    };

    return (
        <div>
            <div>
                
            </div>
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

        </div>
    );
};
