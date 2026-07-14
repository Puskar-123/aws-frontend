import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import NotificationItem from "./NotificationItem";
import { notificationRequest } from "./notificationApi";
import "./notifications.css";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [state, setState] = useState({ loading: true, error: "" });

  const load = useCallback(async (nextPage = 1, append = false) => {
    setState({ loading: true, error: "" });
    try {
      const query = new URLSearchParams({ status, page: String(nextPage), limit: "20" });
      if (type) query.set("type", type);
      const data = await notificationRequest(`/?${query}`);
      setNotifications((current) => append ? [...current, ...(data.notifications || [])] : (data.notifications || []));
      setUnreadCount(data.unreadCount || 0); setPagination(data.pagination || { page: 1, pages: 1 }); setPage(nextPage);
      setState({ loading: false, error: "" });
    } catch (error) { setState({ loading: false, error: error.message }); }
  }, [status, type]);
  useEffect(() => { load(1); }, [load]);

  const markRead = async (notification, open = false) => {
    const previous = notifications; const previousCount = unreadCount;
    if (!notification.read) { setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, read: true } : item)); setUnreadCount((count) => Math.max(0, count - 1)); }
    try { if (!notification.read) await notificationRequest(`/${notification._id}/read`, { method: "PATCH" }); if (open) navigate(notification.url); }
    catch (error) { setNotifications(previous); setUnreadCount(previousCount); setState({ loading: false, error: error.message }); }
  };
  const markAll = async () => {
    const previous = notifications; const previousCount = unreadCount;
    setNotifications((items) => items.map((item) => ({ ...item, read: true }))); setUnreadCount(0);
    try { await notificationRequest("/read-all", { method: "PATCH" }); }
    catch (error) { setNotifications(previous); setUnreadCount(previousCount); setState({ loading: false, error: error.message }); }
  };
  const deleteRead = async () => {
    try { await notificationRequest("/read", { method: "DELETE" }); setNotifications((items) => items.filter((item) => !item.read)); }
    catch (error) { setState({ loading: false, error: error.message }); }
  };

  return <div className="notifications-page"><Navbar /><main className="notifications-container">
    <header><div><h1>Notifications</h1><p>{unreadCount} unread</p></div><div className="notifications-actions"><button type="button" onClick={markAll} disabled={!unreadCount}>Mark all as read</button><button type="button" onClick={deleteRead}>Delete read</button></div></header>
    <div className="notifications-filters" aria-label="Notification filters">
      <button type="button" className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>All</button>
      <button type="button" className={status === "unread" ? "active" : ""} onClick={() => setStatus("unread")}>Unread</button>
      <label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">All activity</option><option value="commit">Commits</option><option value="pull_request">Pull requests</option><option value="issue">Issues</option><option value="repository_forked">Forks</option></select></label>
    </div>
    {state.error && <p className="notifications-state notifications-state--error" role="alert">{state.error}</p>}
    {!state.loading && !state.error && !notifications.length && <p className="notifications-state">No notifications match this filter.</p>}
    <section className="notifications-list" aria-label="Notification results">{notifications.map((item) => <NotificationItem key={item._id} notification={item} onOpen={(value) => markRead(value, true)} onMarkRead={markRead} />)}</section>
    {state.loading && <p className="notifications-state" role="status">Loading notifications…</p>}
    {!state.loading && page < pagination.pages && <button type="button" className="notifications-load-more" onClick={() => load(page + 1, true)}>Load more</button>}
  </main></div>;
};
export default NotificationsPage;
