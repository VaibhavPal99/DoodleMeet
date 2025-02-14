"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rooms = {};
// const redisUrl = process.env.REDIS_URL as string;
// const redis = new Redis(redisUrl, {
//     tls: { rejectUnauthorized: false } // Required for Render's Redis
// });
const redis = new ioredis_1.default("rediss://red-cumvljlsvqrc73fm1mt0:PPzm8DOtNH71EbcwkfAqKSw7tozc9XW7@oregon-redis.render.com:6379");
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    console.log('Client connected');
    let currentRoomId = null;
    ws.on('message', (message) => __awaiter(void 0, void 0, void 0, function* () {
        const data = JSON.parse(message);
        console.log("data", data);
        if (data.type === 'createRoom') {
            const roomId = (0, uuid_1.v4)();
            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            rooms[roomId].push(ws);
            currentRoomId = roomId;
            ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
            console.log(`Room created: ${roomId}`);
        }
        if (data.type === 'joinRoom') {
            const roomId = data.roomId;
            if (rooms[roomId]) {
                rooms[roomId].push(ws);
                currentRoomId = roomId;
                console.log(rooms);
                // Send a confirmation to the user that they joined the room
                ws.send(JSON.stringify({ type: 'roomJoined', roomId }));
                const savedCanvasState = yield redis.lrange(`canvas:${roomId}`, 0, -1);
                if (savedCanvasState) {
                    ws.send(JSON.stringify({ type: 'canvasState', state: savedCanvasState.map((item) => JSON.parse(item)) }));
                }
                const chatHistory = yield redis.lrange(`chat:${roomId}`, 0, -1);
                if (chatHistory.length > 0) {
                    ws.send(JSON.stringify({ type: 'chatHistory', messages: chatHistory.map((msg) => JSON.parse(msg)) }));
                }
                broadcast(roomId, { type: 'userJoined', roomId });
                console.log(`User joined room: ${roomId}`);
            }
            else {
                // Send an error if the room doesn't exist
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            }
        }
        if (data.type === 'leaveRoom') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(client => client !== ws);
                broadcast(roomId, { type: 'userLeft', roomId });
                console.log(`User left room: ${roomId}`);
                if (rooms[roomId].length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted (no users left).`);
                }
                ws.send(JSON.stringify({ type: 'leftRoom', roomId }));
                currentRoomId = null;
            }
        }
        if (data.type === 'message') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                const chatMessage = {
                    type: 'message',
                    sender: data.sender,
                    content: data.content,
                    timestamp: new Date().toISOString()
                };
                // Save the message in Redis (optional, for history retrieval)
                yield redis.rpush(`chat:${roomId}`, JSON.stringify(chatMessage));
                // Broadcast the message to all users in the room
                broadcast(roomId, chatMessage);
                console.log(`Message sent in room ${roomId}: ${data.content}`);
            }
        }
        if (data.type === 'start') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                yield redis.rpush(`canvas:${roomId}`, JSON.stringify(data));
                broadcast(roomId, data); // Send drawing data to everyone in the room
            }
        }
        if (data.type === 'draw') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                yield redis.rpush(`canvas:${roomId}`, JSON.stringify(data));
                broadcast(roomId, data); // Send drawing data to everyone in the room
            }
        }
        if (data.type === 'end') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                yield redis.rpush(`canvas:${roomId}`, JSON.stringify(data));
                broadcast(roomId, data); // Send drawing data to everyone in the room
            }
        }
        if (data.type === 'cursor') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                broadcast(roomId, data);
            }
        }
        // if (data.type === 'undo') {
        //     const roomId = currentRoomId;
        //     if (!roomId || !rooms[roomId]) return;
        //     const lastAction = await redis.rpop(`canvas:${roomId}`);
        //     if (lastAction) {
        //         await redis.rpush(`redo:${roomId}`, lastAction);
        //     }
        //     const updatedHistory = await redis.lrange(`canvas:${roomId}`, 0, -1);
        //     ws.send(JSON.stringify({ type: 'canvasState', state: updatedHistory.map((item) => JSON.parse(item)) }));
        // }
        // if (data.type === 'redo') {
        //     const roomId = currentRoomId;
        //     if (!roomId || !rooms[roomId]) return;
        //     const lastUndone = await redis.rpop(`redo:${roomId}`);
        //     if (lastUndone) {
        //         await redis.rpush(`canvas:${roomId}`, lastUndone);
        //     }
        //     const updatedHistory = await redis.lrange(`canvas:${roomId}`, 0, -1);
        //     ws.send(JSON.stringify({ type: 'canvasState', state: updatedHistory.map((item) => JSON.parse(item)) }));
        // }
    }));
    ws.on('close', () => {
        if (currentRoomId && rooms[currentRoomId]) {
            // rooms[currentRoomId] = rooms[currentRoomId].filter(client => client !== ws);
            rooms[currentRoomId] = rooms[currentRoomId].filter(client => client.readyState === ws_1.WebSocket.OPEN);
            // If the room is empty, remove it from the rooms object
            if (rooms[currentRoomId].length === 0) {
                delete rooms[currentRoomId];
                redis.del(`canvas:${currentRoomId}`); // Delete canvas state when room is empty
                redis.del(`chat:${currentRoomId}`);
                console.log(`Room ${currentRoomId} deleted.`);
            }
            // Notify other users in the room that someone has left
            broadcast(currentRoomId, { type: 'userLeft' });
            console.log('User disconnected from room:', currentRoomId);
        }
    });
});
const broadcast = (roomId, message) => {
    if (rooms[roomId]) {
        rooms[roomId].forEach(client => {
            client.send(JSON.stringify(message));
        });
    }
};
console.log('WebSocket server is running on ws://localhost:8080');
