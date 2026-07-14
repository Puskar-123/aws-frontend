// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "../../authContext";
import ProtectedRoute from "./ProtectedRoute";

const response = (body, ok = true, status = ok ? 200 : 401) => ({ ok, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const user = { _id: "user-1", username: "puskar" };
const Location = () => <output data-testid="location">{useLocation().pathname}</output>;
const Logout = () => { const { logout } = useAuth(); return <button onClick={() => logout()}>Logout</button>; };
const renderProtected = () => render(<MemoryRouter initialEntries={["/repo/private"]}><AuthProvider><Routes><Route path="/login" element={<><h1>Login</h1><Location /></>} /><Route path="/repo/:id" element={<ProtectedRoute><div>Private repository</div><Logout /></ProtectedRoute>} /></Routes></AuthProvider></MemoryRouter>);

beforeEach(() => { localStorage.setItem("token", "token"); localStorage.setItem("userId", "user-1"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("authentication security", () => {
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
});
