import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../context/SocketProvider";
import { CursorTracker } from "../CursorTracker/CursorTracker";
import { Toolbar } from "../Toolbar/Toolbar";
import { useRecoilValue } from "recoil";
import { roomIdAtom } from "../../atoms/roomIdAtom";
import { useNavigate } from "react-router-dom";

export const DrawingCanvas = () => {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState<"draw" | "erase">("draw");
    const [color, setColor] = useState("black");
    const roomId = useRecoilValue(roomIdAtom) || localStorage.getItem("roomId");
    const history = useRef<ImageData[]>([]);
    const redoStack = useRef<ImageData[]>([]);
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
                updateCanvas(data);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
    }, [socket]);

    const updateCanvas = (data: any) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.globalCompositeOperation = data.erase ? "destination-out" : "source-over";

        switch (data.type) {
            case "start":
                ctx.beginPath();
                ctx.moveTo(data.x, data.y);
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.lineWidth;
                break;
            case "draw":
                ctx.lineTo(data.x, data.y);
                ctx.stroke();
                break;
            case "end":
                ctx.closePath();
                break;
            default:
                break;
        }
    };

    const handleStartDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!ctxRef.current || !socket || !canvasRef.current) return;

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;

        // Save current state for undo before drawing
        history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

        // Clear redo stack since a new action invalidates redo history
        redoStack.current = [];

        setIsDrawing(true);

        const { offsetX, offsetY } = event.nativeEvent;
        const userColor = color;

        ctx.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        ctx.strokeStyle = userColor;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);

        socket.send(
            JSON.stringify({
                type: "start",
                x: offsetX,
                y: offsetY,
                color: userColor,
                lineWidth: ctx.lineWidth,
                erase: mode === "erase",
            })
        );
    }, [socket, mode, color, size]);

    const handleDraw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctxRef.current || !socket) return;

        const { offsetX, offsetY } = event.nativeEvent;

        ctxRef.current.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        socket.send(
            JSON.stringify({
                type: "draw",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
                erase: mode === "erase",
            })
        );
    }, [isDrawing, socket, mode]);

    const handleEndDrawing = useCallback(() => {
        if (!ctxRef.current || !socket) return;
        setIsDrawing(false);

        socket.send(
            JSON.stringify({
                type: "end",
            })
        );
    }, [socket]);

    const setToDraw = useCallback(() => {
        setMode("draw");
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "source-over";
        }
    }, []);

    const setToErase = useCallback(() => {
        setMode("erase");
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "destination-out";
            ctxRef.current.lineWidth = 5;
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

    const handleUndo = () => {
        if (history.current.length > 0 && canvasRef.current && ctxRef.current) {
            const ctx = ctxRef.current;
            const canvas = canvasRef.current;

            // Save current state before undoing
            redoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

            // Restore previous state
            const lastState = history.current.pop();
            if (lastState) {
                ctx.putImageData(lastState, 0, 0);
            }
        }
    };

    const handleRedo = () => {
        if (redoStack.current.length > 0 && canvasRef.current && ctxRef.current) {
            const ctx = ctxRef.current;
            const canvas = canvasRef.current;

            // Save current state before redoing
            history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

            // Restore the last undone state
            const lastState = redoStack.current.pop();
            if (lastState) {
                ctx.putImageData(lastState, 0, 0);
            }
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
    
        // Create a temporary canvas with the same size
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return;
    
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
    
        // Fill the temporary canvas with a white background
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
        // Draw the original canvas content on top of the white background
        tempCtx.drawImage(canvas, 0, 0);
    
        // Convert to PNG image
        const imageURL = tempCanvas.toDataURL("image/png");
        
        // Create a link and trigger the download
        const link = document.createElement("a");
        link.href = imageURL;
        link.download = "canvas_drawing.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="canvas-wrapper">
            <Toolbar 
                setToDraw={setToDraw} 
                setToErase={setToErase} 
                onColorChange={handleColorChange} 
                onCopyRoomId={handleCopyRoomId} 
                onUndo={handleUndo} 
                onRedo={handleRedo}
                onLeaveRoom={handleLeaveRoom}
                onSizeChange={handleSizeChange}
                onDownload={handleDownload}
            />
            <canvas
                className="canvas-container"
                ref={canvasRef}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDrawing}
                onMouseLeave={handleEndDrawing}
            />
            <CursorTracker />
        </div>
    );
};
