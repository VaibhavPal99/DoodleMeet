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
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const rooms = {};
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
                broadcast(roomId, chatMessage);
                // Broadcast the message to all users in the room
                console.log(`Message sent in room ${roomId}: ${data.content}`);
            }
        }
        if (data.type === "stroke") {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting stroke in room: ${roomId}`);
                broadcast(roomId, data);
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
            broadcast(currentRoomId, { type: 'userLeft' });
            if (rooms[currentRoomId].length === 0) {
                delete rooms[currentRoomId];
                console.log(`Room ${currentRoomId} deleted.`);
            }
            // Notify other users in the room that someone has left
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
