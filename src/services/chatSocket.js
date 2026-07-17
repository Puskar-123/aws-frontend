import { io } from "socket.io-client";

export const SOCKET_URL=String(import.meta.env.VITE_API_URL||"https://api.codehub.sbs").replace(/\/$/,"");

export function createChatSocket(token){return io(`${SOCKET_URL}/chat`,{path:"/socket.io",withCredentials:true,transports:["websocket","polling"],auth:token?{token}:undefined,autoConnect:false,reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:1000,reconnectionDelayMax:5000,timeout:20000});}
