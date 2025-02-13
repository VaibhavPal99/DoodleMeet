import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useSocket } from "../../context/SocketProvider";
import "./Chatbox.css"; // Import CSS file

interface Message {
    sender: string;
    content: string;
    timestamp: string;
}

export default function Chatbox() {
    const { socket } = useSocket();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState("");
    const username = localStorage.getItem("username") || "Anonymous";

    // Handle incoming messages
    useEffect(() => {
        if (!socket) return;

        const handleMessage = (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === "message") {
                setMessages((prev) => [...prev, data]);
            } else if (data.type === "chatHistory") {
                setMessages(data.messages);
            }
        };

        socket.addEventListener("message", handleMessage);

        return () => {
            socket.removeEventListener("message", handleMessage);
        };
    }, [socket]);

    // Send message to WebSocket
    const sendMessage = () => {
        if (!socket || message.trim() === "") return;

        const chatMessage = {
            type: "message",
            sender: username,
            content: message,
            timestamp: new Date().toISOString(),
        };

        socket.send(JSON.stringify(chatMessage));
        setMessage("");
    };

    return (
        <div className="chatbox">
            {/* Chat Header with Toggle Button */}
            <div className="chatbox-header" onClick={() => setIsOpen(!isOpen)}>
                <span className="chatbox-title">Chat</span>
                {isOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </div>

            {/* Chat Body (Shown Only If Open) */}
            {isOpen && (
                <div className="chatbox-body">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`chatbox-message ${msg.sender === username ? "user" : "other"}`}
                        >
                            <strong>{msg.sender}:</strong> {msg.content}
                        </div>
                    ))}
                </div>
            )}

            {/* Input Field */}
            {isOpen && (
                <div className="chatbox-footer">
                    <input
                        type="text"
                        className="chatbox-input"
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <button className="chatbox-send" onClick={sendMessage}>
                        Send
                    </button>
                </div>
            )}
        </div>
    );
}
