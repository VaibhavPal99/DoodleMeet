import { useEffect, useRef, useState, useCallback } from "react";
import "./DrawingCanvas.css";

export interface DrawingCanvasProps {
    socket: WebSocket;
}

export const DrawingCanvas = ({ socket }: DrawingCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

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
        if (!ctxRef.current) return;
        setIsDrawing(true);

        const { offsetX, offsetY } = event.nativeEvent;
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(offsetX, offsetY);

        socket.send(
            JSON.stringify({
                type: "start",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
                erase: ctxRef.current.globalCompositeOperation === "destination-out",
            })
        );
    }, [socket]);

    const handleDraw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctxRef.current) return;

        const { offsetX, offsetY } = event.nativeEvent;
        ctxRef.current.lineTo(offsetX, offsetY);
        ctxRef.current.stroke();

        socket.send(
            JSON.stringify({
                type: "draw",
                x: offsetX,
                y: offsetY,
                color: ctxRef.current.strokeStyle,
                lineWidth: ctxRef.current.lineWidth,
                erase: ctxRef.current.globalCompositeOperation === "destination-out",
            })
        );
    }, [isDrawing, socket]);

    const handleEndDrawing = useCallback(() => {
        if (!ctxRef.current) return;
        setIsDrawing(false);

        socket.send(
            JSON.stringify({
                type: "end",
            })
        );
    }, [socket]);

    const setToDraw = useCallback(() => {
        if (ctxRef.current) {
            ctxRef.current.globalCompositeOperation = "source-over";
        }
    }, []);

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
