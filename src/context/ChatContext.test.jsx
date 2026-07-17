// @vitest-environment jsdom
import React from"react";
import{act,cleanup,render,screen}from"@testing-library/react";
import{afterEach,beforeEach,describe,expect,test,vi}from"vitest";
import{ChatProvider,useChat}from"./ChatContext";

const state=vi.hoisted(()=>{const handlers={},managerHandlers={};return{handlers,managerHandlers,socket:{connected:false,id:"socket-1",io:{on:(event,fn)=>{managerHandlers[event]=fn;}},on:(event,fn)=>{handlers[event]=fn;},emit:vi.fn(),connect:vi.fn(),disconnect:vi.fn()}};});
vi.mock("../authContext",()=>({useAuth:()=>({token:"valid-token"})}));
vi.mock("../services/chatSocket",()=>({createChatSocket:()=>state.socket}));
vi.mock("../services/chatApi",()=>({chatRequest:vi.fn(async()=>({conversations:[]}))}));
const Probe=()=>{const chat=useChat();return <><span data-testid="connection">{chat.connection}</span><span data-testid="counts">{JSON.stringify(chat.conversationPresence.c1||{})}</span><span data-testid="access">{chat.accessError}</span></>;};

beforeEach(()=>{state.socket.connected=false;state.socket.connect.mockClear();state.socket.disconnect.mockClear();state.socket.emit.mockClear();for(const key of Object.keys(state.handlers))delete state.handlers[key];for(const key of Object.keys(state.managerHandlers))delete state.managerHandlers[key];});
afterEach(()=>cleanup());

describe("chat socket lifecycle",()=>{
 test("starts connecting, becomes connected, and returns to reconnecting",()=>{render(<ChatProvider><Probe/></ChatProvider>);expect(screen.getByTestId("connection").textContent).toBe("connecting");act(()=>{state.socket.connected=true;state.handlers.connect();});expect(screen.getByTestId("connection").textContent).toBe("connected");act(()=>state.managerHandlers.reconnect_attempt(1));expect(screen.getByTestId("connection").textContent).toBe("reconnecting");act(()=>state.handlers.connect());expect(screen.getByTestId("connection").textContent).toBe("connected");});
 test("offline and authentication failures have distinct states",()=>{render(<ChatProvider><Probe/></ChatProvider>);act(()=>window.dispatchEvent(new Event("offline")));expect(screen.getByTestId("connection").textContent).toBe("offline");act(()=>state.handlers.connect_error({message:"AUTHENTICATION_REQUIRED"}));expect(screen.getByTestId("connection").textContent).toBe("authentication_error");});
 test("conversation presence acknowledgements update member and online counts",()=>{render(<ChatProvider><Probe/></ChatProvider>);act(()=>state.handlers["conversation:presence"]({conversationId:"c1",memberCount:1,onlineCount:1}));expect(screen.getByTestId("counts").textContent).toBe('{"memberCount":1,"onlineCount":1}');});
 test("access revocation exposes a safe error",()=>{render(<ChatProvider><Probe/></ChatProvider>);act(()=>state.handlers["access:revoked"]({conversationId:"c1"}));expect(screen.getByTestId("access").textContent).toContain("no longer have access");});
});
