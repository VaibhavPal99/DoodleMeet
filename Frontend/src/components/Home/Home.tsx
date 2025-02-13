import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketProvider";
import { useRecoilState, useSetRecoilState } from "recoil";
import { usernameAtom } from "../../atoms/usernameAtom";
import { roomIdAtom } from "../../atoms/roomIdAtom";
import "./Home.css"; // Import the updated CSS file

export const Home = () => {
    const { socket } = useSocket();
    const [roomId, setRoomId] = useState("");
    const [userName, setUserName] = useRecoilState(usernameAtom);
    const setRoomIdAtom = useSetRecoilState(roomIdAtom);
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
                    setRoomIdAtom(data.roomId);
                    localStorage.setItem("roomId", data.roomId);
                    navigate(`/room/${data.roomId}`);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        return () => {
            socket.onmessage = null;
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
        localStorage.setItem("roomId", roomId);
        setRoomIdAtom(roomId);
        socket.send(JSON.stringify({ type: "joinRoom", roomId }));

        socket.onmessage = async (event) => {
            try {
                let textData;
                if (event.data instanceof Blob) {
                    textData = await event.data.text();
                } else {
                    textData = event.data;
                }

                const data = JSON.parse(textData);
                console.log("Server Response:", data);

                if (data.type === "error" && data.message === "Room not found") {
                    alert("Room does not exist! Please check the Room ID.");
                    return;
                }

                if (data.type === "roomJoined") {
                    navigate(`/room/${roomId}`);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
    };

    return (
        <div className="home-container">
            <h1 className="title">DoodleMeet </h1>
            <h1 className="title">🎨 A Collaborative Whiteboard</h1>

            <div className="input-group">
                <label htmlFor="username">👤 Your Name</label>
                <input
                    id="username"
                    type="text"
                    value={userName}
                    onChange={(e) => {
                        setUserName(e.target.value);
                        localStorage.setItem("username", e.target.value);
                    }}
                    placeholder="Enter your name"
                />
            </div>

            <button className="create-btn" onClick={handleCreateRoom} disabled={!userName.trim()}>
                ✨ Create New Room
            </button>

            <div className="input-group">
                <label htmlFor="room-id">🔑 Room ID</label>
                <input
                    id="room-id"
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Room ID"
                />
            </div>

            <button className="join-btn" onClick={handleJoinRoom} disabled={!userName.trim() || !roomId.trim()}>
                🚀 Join Room
            </button>
        </div>
    );
};
