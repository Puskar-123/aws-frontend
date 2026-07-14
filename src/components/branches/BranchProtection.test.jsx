// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import BranchProtectionSettingsPage from "./BranchProtectionSettingsPage";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));

const id = "507f1f77bcf86cd799439011";
const branches = { defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "feature/login", isDefault: false }] };
const rules = { requirePullRequest: true, requiredApprovals: 1, blockDirectCommits: true, blockForcePush: true, blockDeletion: true, requireResolvedConversations: false, dismissStaleApprovals: false, allowOwnerBypass: true, allowMaintainerBypass: false };
const protectedMain = { branch: "main", enabled: true, rules };
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });

function renderPage() {
  return render(<MemoryRouter initialEntries={[`/repo/${id}/settings/branches`]}><Routes><Route path="/repo/:id/settings/branches" element={<BranchProtectionSettingsPage />} /></Routes></MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); localStorage.setItem("token", "test-token"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("branch protection settings", () => {
  test("loads branches and renders existing protection rules", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(response(String(url).endsWith("/branches") ? branches : { protections: [protectedMain] })));
    renderPage();
    expect(await screen.findByRole("heading", { name: "Branch protection" })).toBeTruthy();
    expect(await screen.findByText("main", { selector: "h3" })).toBeTruthy();
    expect(screen.getByText(/Required approvals: 1/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });

  test("validates approvals and creates a rule without reloading", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      calls.push({ url: String(url), method: options.method || "GET", body: options.body });
      if (options.method === "POST") return Promise.resolve(response({ protection: { branch: "main", enabled: true, rules: { ...rules, requiredApprovals: 2 } } }, 201));
      return Promise.resolve(response(String(url).endsWith("/branches") ? branches : { protections: [] }));
    });
    renderPage();
    await screen.findByText("No protected branches.");
    fireEvent.change(screen.getByLabelText("Required approvals"), { target: { value: "11" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save protection rule" }).closest("form"));
    expect(screen.getByRole("status").textContent).toContain("integer from 0 to 10");
    fireEvent.change(screen.getByLabelText("Required approvals"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save protection rule" }));
    expect(await screen.findByText("Branch protection created.")).toBeTruthy();
    expect(screen.getByText("main", { selector: "h3" })).toBeTruthy();
    const createCall = calls.find((call) => call.method === "POST");
    expect(createCall).toBeTruthy();
    expect(JSON.parse(createCall.body).requiredApprovals).toBe(2);
  });

  test("updates and removes an existing rule with confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      if (options.method === "PATCH") return Promise.resolve(response({ protection: { ...protectedMain, rules: { ...rules, requiredApprovals: 3 } } }));
      if (options.method === "DELETE") return Promise.resolve(response({ message: "removed" }));
      return Promise.resolve(response(String(url).endsWith("/branches") ? branches : { protections: [protectedMain] }));
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Required approvals"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save protection rule" }));
    expect(await screen.findByText("Branch protection updated.")).toBeTruthy();
    expect(screen.getByText(/Required approvals: 3/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.getByText("No protected branches.")).toBeTruthy());
    expect(screen.getByText("Branch protection removed.")).toBeTruthy();
  });

  test("announces owner-only API failures inline", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      if (options.method === "POST") return Promise.resolve(response({ error: "You do not have permission to manage branch protection" }, 403));
      return Promise.resolve(response(String(url).endsWith("/branches") ? branches : { protections: [] }));
    });
    renderPage();
    await screen.findByText("No protected branches.");
    fireEvent.click(screen.getByRole("button", { name: "Save protection rule" }));
    expect((await screen.findByRole("status")).textContent).toContain("You do not have permission to manage branch protection");
  });
});
