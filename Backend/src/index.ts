import { WebSocket as WS, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Message, Room } from './types/types';

const rooms: Room = {};

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: WS) => {
    console.log('Client connected');
    let currentRoomId : string | null = null;

    ws.on('message', (message: string) => {

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

                // Notify other users in the room that a new user has joined
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
        

        if (data.type === 'draw') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                broadcast(roomId, data);  // Send drawing data to everyone in the room
            }
        }

        if (data.type === 'start') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
                broadcast(roomId, data);  // Send drawing data to everyone in the room
            }
        }

        if (data.type === 'end') {
            const roomId = currentRoomId;
            if (roomId && rooms[roomId]) {
                console.log(`Broadcasting: ${data.type}, Erase: ${data.erase}`);
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

const broadcast = (roomId : string, message : Message) => {

    if (rooms[roomId]) {

        rooms[roomId].forEach(client => {
            client.send(JSON.stringify(message));
        });

    }
};

console.log('WebSocket server is running on ws://localhost:8080');