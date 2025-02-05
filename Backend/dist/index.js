"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const rooms = {};
const wss = new ws_1.WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
    console.log('Client connected');
    let currentRoomId = null;
    ws.on('message', (message) => {
        console.log('Received:', message);
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
                // Notify other users in the room that a new user has joined
                broadcast(roomId, { type: 'userJoined', roomId });
                console.log(`User joined room: ${roomId}`);
            }
            else {
                // Send an error if the room doesn't exist
                ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
            }
        }
        if (data.type === 'draw') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                broadcast(roomId, data); // Send drawing data to everyone in the room
            }
        }
    });
    ws.on('close', () => {
        if (currentRoomId && rooms[currentRoomId]) {
            rooms[currentRoomId] = rooms[currentRoomId].filter(client => client !== ws);
            // If the room is empty, remove it from the rooms object
            if (rooms[currentRoomId].length === 0) {
                delete rooms[currentRoomId];
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
