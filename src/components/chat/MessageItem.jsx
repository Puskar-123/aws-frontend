import React from "react";
import { chatRequest, downloadChatAttachment } from "../../services/chatApi";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

export default function MessageItem({ message, currentUserId, senderRole, onReply, onChanged }) {
  const own = String(message.sender?._id || message.sender) === String(currentUserId);
  const react = async emoji => { const data = await chatRequest(`/chat/messages/${message._id}/reactions`, { method: "POST", body: JSON.stringify({ emoji }) }); onChanged({ ...message, reactions: data.reactions }); };
  const edit = async () => { const content = window.prompt("Edit message", message.content); if (content == null) return; const data = await chatRequest(`/chat/messages/${message._id}`, { method: "PATCH", body: JSON.stringify({ content }) }); onChanged(data.message); };
  const remove = async () => { if (!window.confirm("Delete this message?")) return; const data = await chatRequest(`/chat/messages/${message._id}`, { method: "DELETE" }); onChanged(data.message); };
  const author = message.sender?.name || message.sender?.username || "CodeHub user";
  return <article className={`chat-message${own ? " chat-message--own" : ""}`} tabIndex="0">
    <div className="chat-avatar" aria-hidden="true">{author[0]?.toUpperCase() || "?"}</div>
    <div className="chat-message-content"><header className="chat-message-meta"><strong>{author}</strong>{senderRole && <span className="chat-role-badge">{senderRole.replaceAll("_", " ")}</span>}<time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{message.editedAt && <span>edited</span>}</header>
      {message.replyTo && <p className="chat-reply-preview">Replying to a message</p>}
      <div className="chat-message-body">{message.deletedAt ? <p className="chat-deleted">This message was deleted.</p> : message.messageType === "voice" ? <VoiceMessagePlayer message={message} /> : message.messageType === "code" ? <pre><code>{message.content}</code></pre> : <p>{message.content}</p>}</div>
      {!message.deletedAt && message.attachments?.map(file => <button type="button" className="chat-attachment" id={`attachment-${file._id}`} name="attachment" key={file._id} onClick={() => downloadChatAttachment(message._id, file)} aria-label={`Download ${file.originalName}`}>{file.originalName} · {Math.ceil(file.size / 1024)} KB</button>)}
      {!!message.reactions?.length && <div className="chat-reactions">{Object.entries(message.reactions.reduce((counts, value) => ({ ...counts, [value.emoji]: (counts[value.emoji] || 0) + 1 }), {})).map(([emoji, count]) => <span key={emoji}>{emoji} {count}</span>)}</div>}
      <div className="chat-message-actions" aria-label="Message actions"><button type="button" onClick={() => onReply(message)} aria-label="Reply to message">Reply</button>{["👍", "❤️", "✅", "👀"].map(emoji => <button type="button" aria-label={`React ${emoji}`} key={emoji} onClick={() => react(emoji)}>{emoji}</button>)}{own && !message.deletedAt && <>{message.messageType !== "voice" && <button type="button" onClick={edit} aria-label="Edit message">Edit</button>}<button type="button" onClick={remove} aria-label="Delete message">Delete</button></>}{!own && <button type="button" aria-label="Report message" onClick={() => chatRequest(`/chat/messages/${message._id}/report`, { method: "POST", body: JSON.stringify({ reason: "other", details: "Reported from message menu" }) })}>Report</button>}</div>
    </div>
  </article>;
}
