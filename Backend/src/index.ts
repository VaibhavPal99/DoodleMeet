import { WebSocket as WS, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Message, Room } from './types/types';
import Redis from 'ioredis';

const PORT = process.env.PORT || 8080;
const rooms: Room = {};

const redis = new Redis();

const wss = new WebSocketServer({ port: Number(process.env.PORT) || 8080 });

wss.on('connection', (ws: WS) => {
    console.log('Client connected');
    let currentRoomId : string | null = null;

    ws.on('message', async (message: string) => {

        const data = JSON.parse(message);
        console.log("data",data);

        


        if(data.type === 'createRoom'){

            const roomId = uuidv4();

            if (!rooms[roomId]) {
                rooms[roomId] = [];
            }
            
            
            rooms[roomId].push(ws);

            currentRoomId = roomId;

            ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
            console.log(`Room created: ${roomId}`);

        }

        if(data.type === 'joinRoom'){

            const roomId = data.roomId;

            if (rooms[roomId]) {
                rooms[roomId].push(ws); 
                currentRoomId = roomId; 
                console.log(rooms);

                // Send a confirmation to the user that they joined the room
                ws.send(JSON.stringify({ type: 'roomJoined', roomId }));


                const savedCanvasState = await redis.lrange(`canvas:${roomId}`,0,-1);

                if(savedCanvasState){
                    ws.send(JSON.stringify({type : 'canvasState', state: savedCanvasState.map((item) => JSON.parse(item))}))
                }

                const chatHistory = await redis.lrange(`chat:${roomId}`, 0, -1);
                if (chatHistory.length > 0) {
                    ws.send(JSON.stringify({ type: 'chatHistory', messages: chatHistory.map((msg) => JSON.parse(msg)) }));
                }

                broadcast(roomId, { type: 'userJoined', roomId });
                console.log(`User joined room: ${roomId}`);
            }else {
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
                    sender: data.sender, // User's name
                    content: data.content, // Message content
                    timestamp: new Date().toISOString()
                };
        
                // Save the message in Redis (optional, for history retrieval)
                await redis.rpush(`chat:${roomId}`, JSON.stringify(chatMessage));
        
                // Broadcast the message to all users in the room
                broadcast(roomId, chatMessage);
                console.log(`Message sent in room ${roomId}: ${data.content}`);
            }
        }
        
        

        if (data.type === 'draw') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);

                await redis.rpush(`canvas:${roomId}`, JSON.stringify(data));

                broadcast(roomId, data);  // Send drawing data to everyone in the room
            }
        }

        if (data.type === 'start') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {

                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);

                await redis.rpush(`canvas:${roomId}`, JSON.stringify(data));

                broadcast(roomId, data);  // Send drawing data to everyone in the room
            }
        }

        if (data.type === 'end') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);

                await redis.rpush(`canvas:${roomId}`, JSON.stringify(data));

                broadcast(roomId, data);  // Send drawing data to everyone in the room
            }
        }

        if(data.type === 'cursor'){
            const roomId  = currentRoomId;
            if(roomId && rooms[roomId]){
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                broadcast(roomId,data);
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

    });

    ws.on('close', () => {
        if (currentRoomId && rooms[currentRoomId]) {
            // rooms[currentRoomId] = rooms[currentRoomId].filter(client => client !== ws);
            rooms[currentRoomId] = rooms[currentRoomId].filter(client => client.readyState === WS.OPEN);
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

const broadcast = (roomId : string, message : Message) => {

    if (rooms[roomId]) {

        rooms[roomId].forEach(client => {
            client.send(JSON.stringify(message));
        });

    }
};

console.log('WebSocket server is running on ws://localhost:' + (process.env.PORT || 8080));