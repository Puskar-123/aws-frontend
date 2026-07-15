import React from "react";
import { FiCheck, FiGitCommit, FiGitPullRequest, FiInfo, FiMessageCircle } from "react-icons/fi";

const iconFor = (type) => {
  if (type === "commit" || type === "branch_created") return <FiGitCommit aria-hidden="true" />;
  if (type?.startsWith("pull_request")) return <FiGitPullRequest aria-hidden="true" />;
  if (type?.startsWith("issue")) return <FiMessageCircle aria-hidden="true" />;
  return <FiInfo aria-hidden="true" />;
};
const relativeTime = (date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const NotificationItem = ({ notification, onOpen, onMarkRead, compact = false }) => (
  <article className={`notification-item${notification.read ? "" : " notification-item--unread"}${compact ? " notification-item--compact" : ""}`}>
    <button type="button" className="notification-item__main" onClick={() => onOpen(notification)}>
      <span className="notification-item__icon">{iconFor(notification.type)}</span>
      <span className="notification-item__content">
        <strong>{notification.title}</strong>
        {notification.message && <span>{notification.message}</span>}
        <small>{notification.repository?.name || "ContalSystem"} · {relativeTime(notification.createdAt)}</small>
      </span>
      {!notification.read && <span className="notification-item__dot"><span className="sr-only">Unread</span></span>}
    </button>
    {!notification.read && onMarkRead && (
      <button type="button" className="notification-item__read" aria-label={`Mark ${notification.title} as read`} onClick={() => onMarkRead(notification)}><FiCheck aria-hidden="true" /></button>
    )}
  </article>
);

export default NotificationItem;
