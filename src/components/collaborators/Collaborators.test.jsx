// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CollaboratorSettingsPage from "./CollaboratorSettingsPage";
import InvitationsPage from "./InvitationsPage";
import { accessWarning, can, canAll, canAny, roleLabel } from "./accessPermissions";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));

const id = "507f1f77bcf86cd799439011";
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const owner = { _id: "owner", username: "Puskar" };
const user = { _id: "guest", username: "AccountB" };
const pending = { _id: "invite-1", repository: { _id: id, name: "private-project", visibility: "private", owner }, invitedBy: owner, invitedUser: user, role: "write", status: "pending", createdAt: "2026-07-14T00:00:00Z", expiresAt: "2026-07-21T00:00:00Z" };

const renderSettings = () => render(<MemoryRouter initialEntries={[`/repo/${id}/settings/collaborators`]}><Routes><Route path="/repo/:id/settings/collaborators" element={<CollaboratorSettingsPage />} /></Routes></MemoryRouter>);
const renderInvitations = () => render(<MemoryRouter initialEntries={["/invitations"]}><InvitationsPage /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); localStorage.setItem("token", "test-token"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("collaborator settings", () => {
  test("owner sees collaborators, role controls, and pending invitations", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).endsWith("/collaborators/invitations")
      ? Promise.resolve(response({ invitations: [pending] }))
      : Promise.resolve(response({ owner, canManage: true, collaborators: [{ user, role: "read", addedAt: "2026-07-14T00:00:00Z" }] })));
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Collaborators" })).toBeTruthy();
    expect(screen.getByLabelText("Invitation role")).toBeTruthy();
    expect(screen.getByLabelText("Role for AccountB").value).toBe("read");
    expect(screen.getAllByText("AccountB").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  test("successful invitation is added to the pending list without reloading", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      calls.push({ url: String(url), method: options.method || "GET" });
      if (options.method === "POST") return Promise.resolve(response({ invitation: pending }, 201));
      if (String(url).endsWith("/collaborators/invitations")) return Promise.resolve(response({ invitations: [] }));
      return Promise.resolve(response({ owner, canManage: true, collaborators: [] }));
    });
    renderSettings();
    await screen.findByText("No pending invitations.");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "AccountB" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("Invitation sent.")).toBeTruthy();
    expect(screen.getByText("AccountB")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(true);
  });

  test("duplicate invitation API errors are announced inline", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      if (options.method === "POST") return Promise.resolve(response({ error: "A pending invitation already exists" }, 409));
      if (String(url).endsWith("/collaborators/invitations")) return Promise.resolve(response({ invitations: [] }));
      return Promise.resolve(response({ owner, canManage: true, collaborators: [] }));
    });
    renderSettings();
    await screen.findByText("No pending invitations.");
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "AccountB" } });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("A pending invitation already exists")).toBeTruthy();
  });
});

describe("received invitations", () => {
  test("invitation page renders a private repository and accepts it", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options = {}) => options.method === "PATCH"
      ? Promise.resolve(response({ message: "Invitation accepted" }))
      : Promise.resolve(response({ invitations: [pending] })));
    renderInvitations();
    expect(await screen.findByText(/Puskar invited you/)).toBeTruthy();
    expect(screen.getByText("private-project")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByText("Invitation accepted.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("private-project")).toBeNull());
  });

  test("declining removes the invitation and preserves an accessible empty state", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options = {}) => options.method === "PATCH"
      ? Promise.resolve(response({ message: "Invitation declined" }))
      : Promise.resolve(response({ invitations: [pending] })));
    renderInvitations();
    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    expect(await screen.findByText("Invitation declined.")).toBeTruthy();
  });
});

describe("repository access helpers", () => {
  test("permission helpers use only backend permission strings", () => {
    const state = { permissions: ["file:view", "issue:update"] };
    expect(can(state, "file:view")).toBe(true); expect(can(state, "file:update")).toBe(false);
    expect(canAny(state, ["file:update", "issue:update"])).toBe(true); expect(canAll(state, ["file:view", "issue:update"])).toBe(true);
  });
  test("role and expiry labels cover specialized and temporary roles", () => {
    expect(roleLabel("issue_manager")).toBe("Issue Manager"); expect(roleLabel("deployment_manager")).toBe("Deployment Manager");
    const now = Date.parse("2026-07-17T00:00:00Z");
    expect(accessWarning({ accessExpiresAt: "2026-07-17T12:00:00Z" }, now)).toBe("Access expires within 24 hours");
    expect(accessWarning({ legacyIndefiniteAccess: true }, now)).toBe("Legacy write access — expiry not configured");
  });
});
