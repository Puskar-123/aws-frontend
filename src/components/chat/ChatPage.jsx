import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../Navbar";
import { useChat } from "../../context/ChatContext";
import { useCall } from "../../context/CallContext";
import { mergeMessages } from "../../utils/chatMessages";
import { useAuth } from "../../authContext";
import { chatRequest } from "../../services/chatApi";
import MessageItem from "./MessageItem";
import MessageComposer from "./MessageComposer";
import {
  connectionLabel,
  getConversationHeaderMeta,
  normalizeId,
} from "./conversationHeader";
import "./chat.css";
import "./conversationLabels.css";

export default function ChatPage() {
  const chat = useChat(),
    call = useCall(),
    auth = useAuth(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    selected = params.get("conversation");
  const [reply, setReply] = useState(null),
    [search, setSearch] = useState(""),
    [conversationSearch, setConversationSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [results, setResults] = useState(null),
    [chatError, setChatError] = useState(""),
    [contextOpen, setContextOpen] = useState(true),
    [showNewMessages, setShowNewMessages] = useState(false);
  const timelineRef = useRef(null),
    bottomRef = useRef(null),
    nearBottomRef = useRef(true),
    previousCountRef = useRef(0),
    pendingOwnScrollRef = useRef(false),
    preserveScrollRef = useRef(null);
  const currentUserId =
      auth.currentUser?._id ||
      auth.currentUser?.id ||
      auth.currentUser ||
      localStorage.getItem("userId"),
    conversation = chat.conversations.find(
      (value) => String(value._id) === selected,
    ),
    rows = chat.messages[selected] || [],
    latestMessageId = rows.at(-1)?._id,
    other = conversation?.participants?.find(
      (user) => normalizeId(user) !== normalizeId(currentUserId),
    ),
    meta = getConversationHeaderMeta(conversation, {
      conversationPresence: chat.conversationPresence,
      userPresence: chat.presence,
      currentUserId,
    });
  const scrollToLatest = (smooth = false) => {
    if (typeof bottomRef.current?.scrollIntoView === "function")
      bottomRef.current.scrollIntoView({
        block: "end",
        behavior: smooth ? "smooth" : "auto",
      });
    else if (timelineRef.current)
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
  };
  const isNearBottom = (element) =>
    element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  const handleTimelineScroll = (event) => {
    const near = isNearBottom(event.currentTarget);
    nearBottomRef.current = near;
    if (near) setShowNewMessages(false);
  };
  const loadOlderMessages = async () => {
    const element = timelineRef.current;
    if (element)
      preserveScrollRef.current = {
        height: element.scrollHeight,
        top: element.scrollTop,
      };
    await chat.loadOlder(selected);
  };
  useEffect(() => {
    nearBottomRef.current = true;
    previousCountRef.current = 0;
    preserveScrollRef.current = null;
    pendingOwnScrollRef.current = false;
    setShowNewMessages(false);
  }, [selected]);
  useEffect(() => {
    const element = timelineRef.current;
    if (!element || !selected) return;
    const count = rows.length;
    const previousCount = previousCountRef.current;
    previousCountRef.current = count;
    requestAnimationFrame(() => {
      if (preserveScrollRef.current && count > previousCount) {
        const saved = preserveScrollRef.current;
        preserveScrollRef.current = null;
        element.scrollTop = element.scrollHeight - saved.height + saved.top;
      } else if (
        previousCount === 0 ||
        pendingOwnScrollRef.current ||
        nearBottomRef.current
      ) {
        scrollToLatest(Boolean(pendingOwnScrollRef.current));
        nearBottomRef.current = true;
        setShowNewMessages(false);
        pendingOwnScrollRef.current = false;
      } else if (count > previousCount) {
        setShowNewMessages(true);
      }
    });
  }, [selected, rows.length, latestMessageId]);
  useEffect(() => {
    chat.loadConversations();
  }, [chat.loadConversations]);
  useEffect(() => {
    setChatError("");
    call?.clearError?.();
    if (selected)
      chat.open(selected).catch((value) => setChatError(value.message));
  }, [selected, chat.open, call?.clearError]);
  useEffect(() => {
    if (
      !selected ||
      !other?._id ||
      conversation?.type !== "direct" ||
      !chat.socket
    )
      return undefined;
    chat.socket.emit("presence:subscribe", {
      conversationId: selected,
      userId: other._id,
    });
    return () =>
      chat.socket.emit("presence:unsubscribe", { userId: other._id });
  }, [selected, other?._id, conversation?.type, chat.socket]);
  const send = async (payload) => {
    pendingOwnScrollRef.current = true;
    const pending = {
      _id: `pending:${payload.clientMessageId}`,
      conversation: selected,
      sender: { _id: currentUserId, username: "You" },
      sequence: Number.MAX_SAFE_INTEGER,
      createdAt: new Date().toISOString(),
      ...payload,
      pending: true,
    };
    chat.setMessages((current) => ({
      ...current,
      [selected]: mergeMessages(current[selected] || [], pending),
    }));
    try {
      const saved = await chat.send(selected, payload);
      chat.setMessages((current) => ({
        ...current,
        [selected]: mergeMessages(current[selected] || [], saved),
      }));
    } catch (value) {
      chat.setMessages((current) => ({
        ...current,
        [selected]: (current[selected] || []).map((item) =>
          item._id === pending._id
            ? { ...item, pending: false, failed: true }
            : item,
        ),
      }));
      throw value;
    }
  };
  const update = (message) =>
    chat.setMessages((current) => ({
      ...current,
      [selected]: (current[selected] || []).map((value) =>
        String(value._id) === String(message._id) ? message : value,
      ),
    }));
  const voiceSent = (message) => {
    pendingOwnScrollRef.current = true;
    chat.setMessages((current) => ({
      ...current,
      [selected]: [
        ...(current[selected] || []).filter(
          (value) => String(value._id) !== String(message._id),
        ),
        message,
      ].sort((a, b) => a.sequence - b.sequence),
    }));
  };
  const doSearch = async (event) => {
    event.preventDefault();
    if (search.trim().length < 2) return;
    const data = await chatRequest(
      `/chat/conversations/${selected}/search?q=${encodeURIComponent(search)}`,
    );
    setResults(data.messages || []);
  };
  const toggleMute = async () => {
    await chatRequest(
      `/chat/conversations/${selected}/mute`,
      conversation.muted
        ? { method: "DELETE" }
        : { method: "PATCH", body: JSON.stringify({ duration: "indefinite" }) },
    );
    await chat.loadConversations();
  };
  const startContext = (mediaMode) =>
    call
      .start({
        callType: conversation.type,
        conversationId: selected,
        repositoryId: conversation.repository?._id || conversation.repository,
        issueId: conversation.issue?._id || conversation.issue,
        pullRequestId:
          conversation.pullRequest?._id || conversation.pullRequest,
        mediaMode,
      })
      .catch(() => {});
  const filteredConversations = useMemo(
    () =>
      chat.conversations.filter((value) => {
        const term = conversationSearch.trim().toLowerCase();
        const matches =
          !term ||
          String(value.title || value.repository?.name || "")
            .toLowerCase()
            .includes(term);
        const type =
          category === "all" ||
          (category === "repository" && value.type === "repository") ||
          (category === "direct" && value.type === "direct") ||
          (category === "mentor" &&
            ["mentor", "guided_contribution"].includes(value.type));
        return matches && type;
      }),
    [chat.conversations, conversationSearch, category],
  );
  const grouped = useMemo(
    () =>
      filteredConversations.reduce((map, value) => {
        (map[value.type] ||= []).push(value);
        return map;
      }, {}),
    [filteredConversations],
  );
  const messageRole = (message) =>
    conversation?.participants?.find(
      (user) => normalizeId(user) === normalizeId(message.sender),
    )?.role || null;
  const sidebarLabel = (value) => {
    const valueMeta = getConversationHeaderMeta(value, {
      conversationPresence: chat.conversationPresence,
      userPresence: chat.presence,
      currentUserId,
    });
    return value.type === "repository" ? (
      <span className="chat-conversation-label">
        <strong>{value.repository?.name || "Repository"}</strong>
        <span>{valueMeta.title}</span>
      </span>
    ) : (
      <span>{valueMeta.title}</span>
    );
  };
  return (
    <div className="chat-page">
      <Navbar />
      <main className={`chat-shell${selected ? " chat-shell--open" : ""}`}>
        <aside className="chat-sidebar">
          <header>
            <div>
              <span className="chat-eyebrow">Developer workspace</span>
              <h1>CodeHub Chat</h1>
            </div>
            <span
              className={`chat-connection chat-connection--${chat.connection}`}
            >
              <i aria-hidden="true" />
              {connectionLabel(chat.connection)}
            </span>
          </header>
          <label className="chat-search">
            <span aria-hidden="true">⌕</span>
            <input
              id="conversation-search"
              name="conversation-search"
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
            />
          </label>
          <nav className="chat-filters" aria-label="Conversation filters">
            {[
              ["all", "All"],
              ["repository", "Repository"],
              ["direct", "Direct"],
              ["mentor", "Mentor"],
            ].map(([key, label]) => (
              <button
                type="button"
                className={category === key ? "active" : ""}
                key={key}
                onClick={() => setCategory(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          {Object.entries(grouped).map(([type, items]) => (
            <section key={type}>
              <h2>{type.replace("_", " ")}</h2>
              {items.map((value) => (
                <button
                  className={String(value._id) === selected ? "active" : ""}
                  key={value._id}
                  onClick={() => setParams({ conversation: value._id })}
                >
                  {sidebarLabel(value)}
                  {value.muted && <span aria-label="Muted">Muted</span>}
                  {value.unreadCount > 0 && (
                    <strong aria-label={`${value.unreadCount} unread`}>
                      {value.unreadCount}
                    </strong>
                  )}
                </button>
              ))}
            </section>
          ))}
        </aside>
        <section className="chat-main">
          {selected && conversation ? (
            <>
              <header className="chat-header">
                <button className="chat-back" onClick={() => navigate("/chat")}>
                  Back
                </button>
                <div>
                  <h2>{meta.title}</h2>
                  <p>{meta.subtitle}</p>
                </div>
                {call && conversation.type === "direct" && other && (
                  <>
                    <button
                      type="button"
                      disabled={call.checking}
                      onClick={() =>
                        call
                          .start({
                            recipientId: other._id,
                            conversationId: selected,
                            mediaMode: "audio",
                          })
                          .catch(() => {})
                      }
                    >
                      Audio call
                    </button>
                    <button
                      type="button"
                      disabled={call.checking}
                      onClick={() =>
                        call
                          .start({
                            recipientId: other._id,
                            conversationId: selected,
                            mediaMode: "video",
                          })
                          .catch(() => {})
                      }
                    >
                      Video call
                    </button>
                  </>
                )}
                {call &&
                  ["repository", "issue", "pull_request", "mentor"].includes(
                    conversation.type,
                  ) && (
                    <button
                      type="button"
                      disabled={call.checking}
                      onClick={() => startContext("audio")}
                    >
                      {call.checking ? "Checking call…" : "Start context call"}
                    </button>
                  )}
                <button type="button" onClick={toggleMute}>
                  {conversation.muted ? "Unmute" : "Mute"}
                </button>
                {conversation.type === "direct" && other && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Block ${other.username}?`)) {
                        await chatRequest(`/chat/users/${other._id}/block`, {
                          method: "POST",
                        });
                        navigate("/chat");
                      }
                    }}
                  >
                    Block
                  </button>
                )}
                <form onSubmit={doSearch}>
                  <input
                    aria-label="Search messages"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      if (!event.target.value) setResults(null);
                    }}
                  />
                  <button>Search</button>
                </form>
              </header>
              {(chatError || chat.accessError) && (
                <p className="chat-error" role="alert">
                  {chatError || chat.accessError}
                </p>
              )}
              <div
                ref={timelineRef}
                className="chat-messages"
                aria-live="polite"
                onScroll={handleTimelineScroll}
              >
                {!results && rows.length >= 50 && (
                  <button
                    className="chat-load-older"
                    onClick={loadOlderMessages}
                  >
                    Load older messages
                  </button>
                )}
                {(results || rows).map((message) => (
                  <MessageItem
                    key={message._id}
                    message={message}
                    senderRole={messageRole(message)}
                    currentUserId={currentUserId}
                    onReply={setReply}
                    onChanged={update}
                  />
                ))}
                {!rows.length && !results && (
                  <p className="chat-empty">
                    No messages yet. Start the conversation.
                  </p>
                )}
                <div ref={bottomRef} aria-hidden="true" />
                {showNewMessages && (
                  <button
                    type="button"
                    className="chat-new-messages"
                    onClick={() => {
                      scrollToLatest(true);
                      setShowNewMessages(false);
                    }}
                  >
                    New messages
                  </button>
                )}
              </div>
              {chat.typing[selected] && (
                <p className="chat-typing" aria-live="polite">
                  {chat.typing[selected].username} is typing…
                </p>
              )}
              <MessageComposer
                conversationId={selected}
                onVoiceSent={voiceSent}
                reply={reply}
                onCancelReply={() => setReply(null)}
                onSend={send}
                onTyping={() =>
                  chat.socket?.emit("typing:start", {
                    conversationId: selected,
                  })
                }
                onStopTyping={() =>
                  chat.socket?.emit("typing:stop", { conversationId: selected })
                }
                disabled={chat.connection !== "connected"}
              />
            </>
          ) : (
            <div className="chat-welcome">
              <h2>Select a conversation</h2>
              <p>
                Direct messages and repository conversations stay private to
                their permitted participants.
              </p>
            </div>
          )}
        </section>
        {selected && conversation && (
          <aside className="chat-context-panel">
            <button
              type="button"
              className="chat-panel-close"
              aria-label="Close context panel"
              onClick={() => setContextOpen(false)}
            >
              ×
            </button>
            <span className="chat-eyebrow">Repository context</span>
            <h2>{conversation.repository?.name || meta.title}</h2>
            <p>{meta.subtitle?.replace("Online", "Connected")}</p>
            <div className="chat-context-stats">
              <span>
                <strong>
                  {meta.memberCount || conversation.participants?.length || 0}
                </strong>{" "}
                members
              </span>
              <span>
                <strong>{meta.onlineCount || 0}</strong> online
              </span>
            </div>
            <h3>Conversation</h3>
            <p>{conversation.type.replaceAll("_", " ")}</p>
          </aside>
        )}
        {/* context panel is desktop-visible through CSS */}
      </main>
    </div>
  );
}
