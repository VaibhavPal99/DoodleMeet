import { useEffect, useRef, useState, useCallback } from "react";
import "./DrawingCanvas.css";
import { useSocket } from "../../context/SocketProvider";
import { CursorTracker } from "./CursorTracker";

export const DrawingCanvas = () => {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState<"draw" | "erase">("draw"); // Track draw/erase mode

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineCap = "round";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 5;
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
        if (!ctxRef.current || !socket) return;
        setIsDrawing(true);

        const { offsetX, offsetY } = event.nativeEvent;
        ctxRef.current.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);

        socket.send(
            JSON.stringify({
                type: "start",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
                erase: mode === "erase",
            })
        );
    }, [socket, mode]);

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
            console.log("Mode set to Draw");
        }
    }, []);

    const setToErase = useCallback(() => {
        setMode("erase");
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "destination-out";
            ctxRef.current.lineWidth = 5;
            console.log("Mode set to Erase");
        }
    }, []);

    return (
        <>
            <canvas
                className="canvas-container"
                ref={canvasRef}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDrawing}
                onMouseLeave={handleEndDrawing}
            />
            <CursorTracker />
            <div>
                <button onClick={setToDraw} className={mode === "draw" ? "active" : ""}>Draw</button>
                <button onClick={setToErase} className={mode === "erase" ? "active" : ""}>Erase</button>
            </div>
        </>
    );
};
