
import { WebSocket as WS} from 'ws';

export interface Room{

    [key: string]: WS[];

}

export type Message = {
    type: string;
    roomId?: string;
};
