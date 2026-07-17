import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState}from"react";
import{useAuth}from"../authContext";
import{chatRequest}from"../services/chatApi";
import{createChatSocket}from"../services/chatSocket";

const Context=createContext(null),debug=(message,data)=>{if(import.meta.env.DEV)console.info(`[chat] ${message}`,data||"");};
const merge=(rows,item)=>{const map=new Map(rows.map(value=>[String(value._id),value]));map.set(String(item._id),{...map.get(String(item._id)),...item});return[...map.values()].sort((a,b)=>(a.sequence||0)-(b.sequence||0));};

export const ChatProvider=({children})=>{
  const auth=useAuth(),token=auth?.token||"";
  const[socket,setSocket]=useState(null),[connection,setConnection]=useState(token?"connecting":"offline"),[conversations,setConversations]=useState([]),[messages,setMessages]=useState({}),[typing,setTyping]=useState({}),[presence,setPresence]=useState({}),[conversationPresence,setConversationPresence]=useState({}),[accessError,setAccessError]=useState("");
  const openRef=useRef(null),messagesRef=useRef({});
  useEffect(()=>{messagesRef.current=messages;},[messages]);
  const updateConversationPresence=useCallback(data=>{if(!data?.conversationId)return;setConversationPresence(current=>({...current,[String(data.conversationId)]:{memberCount:Number(data.memberCount)||0,onlineCount:Number(data.onlineCount)||0}}));debug("presence count update",{conversationId:data.conversationId,memberCount:data.memberCount,onlineCount:data.onlineCount});},[]);
  const loadConversations=useCallback(async()=>{if(!token)return;try{const data=await chatRequest("/chat/conversations");setConversations(data.conversations||[]);}catch{}},[token]);

  useEffect(()=>{
    if(!token){setConnection("offline");setSocket(null);return undefined;}
    const value=createChatSocket(token);setSocket(value);setConnection("connecting");debug("socket connecting");
    const rejoin=()=>{if(!openRef.current)return;const conversationId=openRef.current;value.emit("conversation:join",{conversationId,afterSequence:(messagesRef.current[conversationId]||[]).at(-1)?.sequence||0},result=>{debug("conversation join result",{success:Boolean(result?.success),conversationId});if(result?.success)updateConversationPresence(result.data||result);});};
    value.on("connect",()=>{setConnection("connected");setAccessError("");debug("socket connected",{socketId:value.id});rejoin();loadConversations();});
    value.on("chat:connected",()=>setConnection("connected"));
    value.on("disconnect",reason=>{setConnection(reason==="io client disconnect"?"offline":navigator.onLine?"reconnecting":"offline");debug("socket disconnected",{reason});});
    value.io.on("reconnect_attempt",attempt=>{setConnection(navigator.onLine?"reconnecting":"offline");debug("reconnection attempt",{attempt});});
    value.on("connect_error",error=>{const code=error?.data?.error||error?.message;if(["AUTHENTICATION_REQUIRED","INVALID_AUTHENTICATION"].includes(code)){setConnection("authentication_error");}else setConnection(navigator.onLine?"reconnecting":"offline");});
    value.on("conversation:joined",data=>{updateConversationPresence(data);if(data?.messages?.length)setMessages(current=>({...current,[data.conversationId]:data.messages.reduce(merge,current[data.conversationId]||[])}));});
    value.on("conversation:presence",updateConversationPresence);
    value.on("message:new",message=>{const key=String(message.conversation);setMessages(current=>({...current,[key]:merge(current[key]||[],message)}));if(openRef.current!==key)setConversations(current=>current.map(item=>String(item._id)===key?{...item,unreadCount:(item.unreadCount||0)+1,lastMessage:message}:item));});
    value.on("message:updated",message=>setMessages(current=>({...current,[message.conversation]:(current[message.conversation]||[]).map(item=>String(item._id)===String(message._id)?message:item)})));
    value.on("message:deleted",message=>setMessages(current=>({...current,[message.conversation]:(current[message.conversation]||[]).map(item=>String(item._id)===String(message._id)?message:item)})));
    value.on("reaction:updated",data=>setMessages(current=>Object.fromEntries(Object.entries(current).map(([key,rows])=>[key,rows.map(message=>String(message._id)===String(data.messageId)?{...message,reactions:data.reactions}:message)]))));
    value.on("typing:started",data=>setTyping(current=>({...current,[data.conversationId]:data.user})));
    value.on("typing:stopped",data=>setTyping(current=>({...current,[data.conversationId]:null})));
    value.on("presence:changed",data=>setPresence(current=>({...current,[data.userId]:data})));
    value.on("access:revoked",data=>{if(openRef.current===data.conversationId)openRef.current=null;setAccessError("You no longer have access to this repository chat.");setConversations(current=>current.filter(item=>String(item._id)!==String(data.conversationId)));});
    const online=()=>{if(!value.connected){setConnection("reconnecting");value.connect();}},offline=()=>setConnection("offline");window.addEventListener("online",online);window.addEventListener("offline",offline);
    value.connect();
    return()=>{window.removeEventListener("online",online);window.removeEventListener("offline",offline);value.disconnect();setSocket(null);};
  },[token,loadConversations,updateConversationPresence]);

  const open=useCallback(async conversationId=>{const key=String(conversationId);if(openRef.current&&openRef.current!==key)socket?.emit("conversation:leave",{conversationId:openRef.current});openRef.current=key;setAccessError("");const data=await chatRequest(`/chat/conversations/${key}/messages?limit=50`);setMessages(current=>({...current,[key]:data.messages||[]}));if(socket?.connected)socket.emit("conversation:join",{conversationId:key,afterSequence:(data.messages||[]).at(-1)?.sequence||0},result=>{debug("conversation join result",{success:Boolean(result?.success),conversationId:key});if(result?.success)updateConversationPresence(result.data||result);});const last=(data.messages||[]).at(-1)?.sequence||0;await chatRequest(`/chat/conversations/${key}/read`,{method:"POST",body:JSON.stringify({sequence:last})});setConversations(current=>current.map(item=>String(item._id)===key?{...item,unreadCount:0}:item));return data;},[socket,updateConversationPresence]);
  const loadOlder=useCallback(async conversationId=>{const key=String(conversationId),before=(messagesRef.current[key]||[])[0]?.sequence;if(!before)return;const data=await chatRequest(`/chat/conversations/${key}/messages?limit=50&before=${before}`);setMessages(current=>({...current,[key]:(data.messages||[]).reduce(merge,current[key]||[])}));return data;},[]);
  const send=useCallback((conversationId,payload)=>new Promise((resolve,reject)=>{if(!socket?.connected)return reject(new Error("Chat is offline"));socket.emit("message:send",{conversationId,...payload},result=>result?.success?resolve(result.data.message):reject(new Error(result?.message||"Unable to send")));}),[socket]);
  const totalUnread=conversations.reduce((sum,item)=>sum+Math.max(0,item.unreadCount||0),0);
  const value=useMemo(()=>({socket,connection,conversations,setConversations,messages,setMessages,typing,presence,conversationPresence,accessError,totalUnread,loadConversations,open,loadOlder,send,openConversationId:openRef.current}),[socket,connection,conversations,messages,typing,presence,conversationPresence,accessError,totalUnread,loadConversations,open,loadOlder,send]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useChat=()=>useContext(Context);
