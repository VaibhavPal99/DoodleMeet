import { WebSocket as WS, WebSocketServer } from 'ws';
import http, { IncomingMessage, ServerResponse } from "http";
import { v4 as uuidv4 } from 'uuid';
import { Message, Room } from './types/types';


const rooms: Room = {};


const server = http.createServer((req : IncomingMessage, res : ServerResponse) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    }
  });

const wss = new WebSocketServer({ server });

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

const broadcast = (roomId : string, message : Message) => {

    if (rooms[roomId]) {

        rooms[roomId].forEach(client => {
            client.send(JSON.stringify(message));
        });

    }
};

const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

setInterval(() => {
    console.log("Heartbeat: WebSocket server is running...");
}, 30000);
  