// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "../../authContext";
import { parseResponse } from "../../utils/api";
import ProtectedRoute from "./ProtectedRoute";
import { safeReturnPath } from "./Login";

const response = (body, ok = true, status = ok ? 200 : 401) => ({ ok, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const user = { _id: "user-1", username: "puskar" };
const Location = () => <output data-testid="location">{useLocation().pathname}</output>;
const Logout = () => { const { logout } = useAuth(); return <button onClick={() => logout()}>Logout</button>; };
const AuthState = () => { const { user, isAuthenticated, isValidating } = useAuth(); return <output data-testid="auth-state">{JSON.stringify({ user: user?._id || null, isAuthenticated, isValidating })}</output>; };
const renderProtected = () => render(<MemoryRouter initialEntries={["/repo/private"]}><AuthProvider><Routes><Route path="/login" element={<><h1>Login</h1><Location /></>} /><Route path="/repo/:id" element={<ProtectedRoute><div>Private repository</div><Logout /></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);

beforeEach(() => { localStorage.setItem("token", "token"); localStorage.setItem("userId", "user-1"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("authentication security", () => {
  test("login return paths allow internal routes only", () => {
    expect(safeReturnPath("/repo/123?branch=main")).toBe("/repo/123?branch=main");
    expect(safeReturnPath("//evil.example/path")).toBe("/dashboard");
    expect(safeReturnPath("https://evil.example/path")).toBe("/dashboard");
  });
  test("waits for validation, then renders protected content", async () => {
    let resolveSession;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    renderProtected();
    expect(screen.getByRole("status").textContent).toContain("Checking your session");
    expect(screen.queryByText("Private repository")).toBeNull();
    resolveSession(response({ user }));
    expect(await screen.findByText("Private repository")).toBeTruthy();
  });

  test("invalid sessions redirect without flashing protected content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ error: "Authentication required" }, false, 401));
    renderProtected();
    expect(await screen.findByRole("heading", { name: "Login" })).toBeTruthy();
    expect(screen.queryByText("Private repository")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("logout clears storage, uses replacement navigation, and bfcache restoration revalidates", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ user }));
    renderProtected();
    fireEvent.click(await screen.findByRole("button", { name: "Logout" }));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Private repository")).toBeNull();
  });

  test("a persisted page with a token revalidates exactly once", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ user }));
    renderProtected();
    await screen.findByText("Private repository");
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Private repository")).toBeTruthy();
  });

  test("cross-tab token removal immediately clears auth and ignores a late session response", async () => {
    let resolveSession;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    render(<MemoryRouter initialEntries={["/repo/private"]}><AuthProvider><AuthState /><Routes><Route path="/login" element={<h1>Login</h1>} /><Route path="/repo/:id" element={<ProtectedRoute><div>Private repository</div></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);
    localStorage.removeItem("token");
    window.dispatchEvent(new StorageEvent("storage", { key: "token", oldValue: "token", newValue: null }));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeTruthy();
    resolveSession(response({ user }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId("auth-state").textContent).user).toBeNull());
    expect(JSON.parse(screen.getByTestId("auth-state").textContent).isAuthenticated).toBe(false);
  });

  test("visibility restoration clears a missing token without a network loop", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ user }));
    renderProtected();
    await screen.findByText("Private repository");
    localStorage.removeItem("token");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("401 dispatches logout but 403 keeps a valid session", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ user }));
    renderProtected();
    await screen.findByText("Private repository");
    await parseResponse(response({ error: "Forbidden" }, false, 403));
    expect(screen.getByText("Private repository")).toBeTruthy();
    expect(localStorage.getItem("token")).toBe("token");
    await parseResponse(response({ error: "Expired" }, false, 401));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
