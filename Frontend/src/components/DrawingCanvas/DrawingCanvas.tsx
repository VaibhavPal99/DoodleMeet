import { useEffect, useRef, useState, useCallback } from "react";
import "./DrawingCanvas.css";

export const DrawingCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080"); // Replace with your WebSocket server URL

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
                updateCanvas(data);
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
        };

        return () => {
            ws.close(); // Cleanup WebSocket connection on unmount
        };
    }, []);

    // Initialize canvas
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

    // Update canvas with received data
    const updateCanvas = (data: any) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

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

    // Handle drawing start
    const handleStartDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!ctxRef.current) return;
        setIsDrawing(true);

        const { offsetX, offsetY } = event.nativeEvent;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);

        // Send drawing start data to the server
        socket?.send(
            JSON.stringify({
                type: "start",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
            })
        );
    }, [socket]);

    // Handle drawing
    const handleDraw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctxRef.current) return;

        const { offsetX, offsetY } = event.nativeEvent;
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        // Send drawing data to the server
        socket?.send(
            JSON.stringify({
                type: "draw",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
            })
        );
    }, [isDrawing, socket]);

    // Handle drawing end
    const handleEndDrawing = useCallback(() => {
        if (!ctxRef.current) return;
        ctxRef.current.closePath();
        setIsDrawing(false);

        // Send drawing end data to the server
        socket?.send(
            JSON.stringify({
                type: "end",
            })
        );
    }, [socket]);

    // Set to draw mode
    const setToDraw = useCallback(() => {
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "source-over";
        }
    }, []);

    // Set to erase mode
    const setToErase = useCallback(() => {
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "destination-out";
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
            <div>
                <button onClick={setToDraw}>Draw</button>
                <button onClick={setToErase}>Erase</button>
            </div>
        </>
    );
};
