import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../context/SocketProvider";
import { CursorTracker } from "../CursorTracker/CursorTracker";
import { Toolbar } from "../Toolbar/Toolbar";
import { useRecoilValue } from "recoil";
import { roomIdAtom } from "../../atoms/roomIdAtom";
import { useNavigate } from "react-router-dom";
import Chatbox from "../Chat/Chatbox";

export const DrawingCanvas = () => {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState<"draw" | "erase">("draw");
    const [color, setColor] = useState("black");
    const roomId = useRecoilValue(roomIdAtom) || localStorage.getItem("roomId");

    const [currentStroke,setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

  
    
    const navigate = useNavigate();
    const [size, setSize] = useState(5);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineCap = "round";
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctxRef.current = ctx;
        }
    }, []);

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
            
                if (data.type === "stroke") {
                    updateCanvas(data.stroke); // Update canvas with received stroke
                }

            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
    }, [socket]);

    const updateCanvas = (stroke: any) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;

       ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            ctx.stroke();
        }

        ctx.closePath();
    };


    const handleStartDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!ctxRef.current || !socket) return;

        const ctx = ctxRef.current;
       
        setIsDrawing(true);
        setCurrentStroke([]);       //Reset Stroke

        const { offsetX, offsetY } = event.nativeEvent;
        ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);

        // socket.send(
        //     JSON.stringify({
        //         type: "start",
        //         x: offsetX,
        //         y: offsetY,
        //         color: ctx.strokeStyle,
        //         lineWidth: ctx.lineWidth,
        //         erase: mode === "erase",
        //     })
        // );
        setCurrentStroke([{ x: offsetX, y: offsetY }]);

    }, [socket, mode, size]);

    const handleDraw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctxRef.current || !socket) return;

        const { offsetX, offsetY } = event.nativeEvent;

        ctxRef.current.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        // socket.send(
        //     JSON.stringify({
        //         type: "draw",
        //         x: offsetX,
        //         y: offsetY,
        //         color: ctxRef.current.strokeStyle,
        //         lineWidth: ctxRef.current.lineWidth,
        //         erase: mode === "erase",
        //     })
        // );

        setCurrentStroke(prev => [...prev, { x: offsetX, y: offsetY }]);

    }, [isDrawing, socket]);

    const handleEndDrawing = useCallback(() => {
        if (!ctxRef.current || !socket) return;
        setIsDrawing(false);

        if (currentStroke.length > 1) {
            socket.send(JSON.stringify({
                type: "stroke",
                stroke: {
                    points: currentStroke,
                    color,
                    lineWidth: size,
                    erase: mode === "erase"
                }
            }));
        }

        setCurrentStroke([]); // Clear stroke


    }, [socket, currentStroke, color, size, mode]);

    const setToDraw = useCallback(() => {
        setMode("draw");
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "source-over";
            console.log("Mode set to draw");
        }
    }, []);

    const setToErase = useCallback(() => {
        setMode("erase");
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "destination-out";
            ctxRef.current.lineWidth = 5;
            // ctxRef.current.strokeStyle = "white";
            console.log("Mode set to Erase");
        }
    }, []);

    const handleColorChange = (newColor: string) => {
        setColor(newColor);
    };

    const handleCopyRoomId = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId);
            alert("Room ID copied!");
        }
    };

    const handleLeaveRoom = () => {
        if (socket) {
            socket.send(JSON.stringify({ type: "leaveRoom", roomId }));
        }
        navigate("/");
    };

    const handleSizeChange = (newSize: number) => {
        setSize(newSize);
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const imageURL = tempCanvas.toDataURL("image/png");

        const link = document.createElement("a");
        link.href = imageURL;
        link.download = "canvas_drawing.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="canvas-wrapper">
            <Toolbar 
                setToDraw={setToDraw} 
                setToErase={setToErase} 
                onColorChange={handleColorChange} 
                onCopyRoomId={handleCopyRoomId}
                onLeaveRoom={handleLeaveRoom}
                onSizeChange={handleSizeChange}
                onDownload={handleDownload}
            />
            <canvas
                ref={canvasRef}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDrawing}
                onMouseLeave={handleEndDrawing}
            />
            <CursorTracker />
            <Chatbox/>
        </div>
    );
};
