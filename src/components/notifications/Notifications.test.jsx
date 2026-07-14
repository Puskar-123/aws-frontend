// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import NotificationBell from "./NotificationBell";
import NotificationsPage from "./NotificationsPage";

let authenticated = true;
vi.mock("../../authContext", () => ({ useAuth: () => ({ isAuthenticated: authenticated }) }));
const item = { _id: "507f1f77bcf86cd799439011", type: "commit", title: "New commit in demo", message: "Update app", url: "/repo/repo", read: false, createdAt: new Date().toISOString(), repository: { name: "demo" } };
const response = (body, ok = true) => ({ ok, status: ok ? 200 : 500, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });

beforeEach(() => { authenticated = true; localStorage.setItem("token", "token"); Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("notifications UI", () => {
  test("bell is hidden logged out and shows an accessible unread badge when logged in", async () => {
    authenticated = false; const { rerender } = render(<MemoryRouter><NotificationBell /></MemoryRouter>); expect(screen.queryByRole("button", { name: /Notifications/ })).toBeNull();
    authenticated = true; vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ unreadCount: 3 })); rerender(<MemoryRouter><NotificationBell /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Notifications, 3 unread" })).toBeTruthy();
  });

  test("dropdown opens, marks a row read optimistically, and supports mark all", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => Promise.resolve(response(String(input).includes("unread-count") ? { unreadCount: 1 } : { notifications: [item], unreadCount: 1, pagination: { page: 1, pages: 1 } })));
    render(<MemoryRouter><NotificationBell /></MemoryRouter>); const bell = await screen.findByRole("button", { name: "Notifications, 1 unread" }); fireEvent.click(bell);
    expect(await screen.findByText("New commit in demo")).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: /Mark New commit/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeTruthy());
  });

  test("notifications page filters and renders an empty state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ notifications: [], unreadCount: 0, pagination: { page: 1, pages: 1 } }));
    render(<MemoryRouter><NotificationsPage /></MemoryRouter>); expect(await screen.findByText("No notifications match this filter.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unread" })); await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });

  test("polling pauses while hidden and refreshes on focus", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ unreadCount: 0 }));
    render(<MemoryRouter><NotificationBell /></MemoryRouter>); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); window.dispatchEvent(new Event("focus"));
    await Promise.resolve(); expect(fetchMock).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
