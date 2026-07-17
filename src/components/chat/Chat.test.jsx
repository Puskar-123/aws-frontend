// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ChatPage from "./ChatPage";
import MessageComposer from "./MessageComposer";

const mocks=vi.hoisted(()=>({chat:null,auth:{currentUser:{_id:"me"}}}));
vi.mock("../../context/ChatContext",()=>({useChat:()=>mocks.chat}));
vi.mock("../../authContext",()=>({useAuth:()=>mocks.auth}));
vi.mock("../Navbar",()=>({default:()=> <nav>Chat navigation</nav>}));
vi.mock("../../services/chatApi",()=>({chatRequest:vi.fn(async()=>({messages:[]})),uploadChatAttachment:vi.fn(async()=>({attachment:{_id:"upload"}})),downloadChatAttachment:vi.fn()}));

const conversation={_id:"c1",type:"direct",title:"Ada",unreadCount:4,participants:[{_id:"me",username:"me"},{_id:"ada",username:"ada"}]};
const message=(sequence=1)=>({_id:`m${sequence}`,conversation:"c1",sequence,sender:{_id:"ada",username:"ada"},messageType:"text",content:`message ${sequence}`,createdAt:new Date().toISOString(),reactions:[]});

beforeEach(()=>{
  localStorage.setItem("userId","me");
  mocks.chat={connection:"connected",conversations:[conversation],messages:{c1:[message()]},typing:{c1:{username:"ada"}},presence:{ada:{online:true}},socket:{emit:vi.fn()},loadConversations:vi.fn(async()=>{}),open:vi.fn(async()=>({messages:[message()]})),loadOlder:vi.fn(async()=>{}),send:vi.fn(),setMessages:vi.fn()};
  Object.defineProperty(globalThis.crypto,"randomUUID",{configurable:true,value:vi.fn(()=>"stable-id")});
});
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});

describe("CodeHub Chat UI",()=>{
  test("loads a conversation and renders unread, messages, typing, and presence",async()=>{
    render(<MemoryRouter initialEntries={["/chat?conversation=c1"]}><ChatPage/></MemoryRouter>);
    expect(screen.getByText("CodeHub Chat")).toBeTruthy();expect(screen.getByLabelText("4 unread")).toBeTruthy();expect(screen.getByText("message 1")).toBeTruthy();expect(screen.getByText("ada is typing…")).toBeTruthy();expect(screen.getByText("Online")).toBeTruthy();
    await waitFor(()=>expect(mocks.chat.open).toHaveBeenCalledWith("c1"));
  });
  test("cursor pagination requests older messages",()=>{
    mocks.chat.messages.c1=Array.from({length:50},(_,index)=>message(index+1));render(<MemoryRouter initialEntries={["/chat?conversation=c1"]}><ChatPage/></MemoryRouter>);fireEvent.click(screen.getByRole("button",{name:"Load older messages"}));expect(mocks.chat.loadOlder).toHaveBeenCalledWith("c1");
  });
  test("failed Retry preserves the client message id and supports code mode",async()=>{
    const onSend=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});render(<MessageComposer onSend={onSend} onCancelReply={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Code"}));fireEvent.change(screen.getByLabelText("Code snippet"),{target:{value:"const safe = true;"}});fireEvent.click(screen.getByRole("button",{name:"Send"}));fireEvent.click(await screen.findByRole("button",{name:"Retry"}));await waitFor(()=>expect(onSend).toHaveBeenCalledTimes(2));expect(onSend.mock.calls[0][0].clientMessageId).toBe(onSend.mock.calls[1][0].clientMessageId);
  });
  test("attachment selection renders a removable preview",()=>{
    render(<MessageComposer onSend={vi.fn()} onCancelReply={()=>{}}/>);const file=new File(["hello"],"notes.txt",{type:"text/plain"});fireEvent.change(screen.getByLabelText("Attach"),{target:{files:[file]}});expect(screen.getByText("notes.txt")).toBeTruthy();fireEvent.click(screen.getByRole("button",{name:"Remove"}));expect(screen.queryByText("notes.txt")).toBeNull();
  });
});
