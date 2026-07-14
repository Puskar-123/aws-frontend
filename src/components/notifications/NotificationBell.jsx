import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import NotificationDropdown from "./NotificationDropdown";
import { notificationRequest } from "./notificationApi";
import "./notifications.css";

const POLL_INTERVAL = 60000;

const NotificationBell = () => {
  const { isAuthenticated } = useAuth() || {};
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [state, setState] = useState({ loading: false, error: "" });

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated || document.visibilityState === "hidden") return;
    try { const data = await notificationRequest("/unread-count"); setUnreadCount(Math.max(0, Number(data.unreadCount) || 0)); } catch { /* retry on focus/poll */ }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); setOpen(false); return undefined; }
    refreshCount();
    const interval = window.setInterval(refreshCount, POLL_INTERVAL);
    const focus = () => refreshCount();
    const visibility = () => { if (document.visibilityState === "visible") refreshCount(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); };
  }, [isAuthenticated, refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    setState({ loading: true, error: "" });
    notificationRequest("/?status=all&page=1&limit=6")
      .then((data) => { setNotifications(data.notifications || []); setUnreadCount(data.unreadCount || 0); setState({ loading: false, error: "" }); })
      .catch((error) => setState({ loading: false, error: error.message }));
    const dismiss = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);

  const markRead = async (notification, navigateAfter = false) => {
    const previous = notifications;
    const previousCount = unreadCount;
    if (!notification.read) {
      setNotifications((items) => items.map((item) => item._id === notification._id ? { ...item, read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
      try { await notificationRequest(`/${notification._id}/read`, { method: "PATCH" }); }
      catch (error) { setNotifications(previous); setUnreadCount(previousCount); setState({ loading: false, error: error.message }); return; }
    }
    if (navigateAfter) { setOpen(false); navigate(notification.url); }
  };
  const markAll = async () => {
    const previous = notifications; const previousCount = unreadCount;
    setNotifications((items) => items.map((item) => ({ ...item, read: true }))); setUnreadCount(0);
    try { await notificationRequest("/read-all", { method: "PATCH" }); }
    catch (error) { setNotifications(previous); setUnreadCount(previousCount); setState({ loading: false, error: error.message }); }
  };

  if (!isAuthenticated) return null;
  return (
    <div className="notification-bell" ref={rootRef}>
      <button type="button" className="notification-bell__button" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <FiBell aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && <NotificationDropdown notifications={notifications} loading={state.loading} error={state.error} onOpen={(item) => markRead(item, true)} onMarkRead={markRead} onMarkAll={markAll} />}
    </div>
  );
};

export default NotificationBell;
