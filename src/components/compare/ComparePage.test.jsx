// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import ComparePage from "./ComparePage";

const id = "507f1f77bcf86cd799439011";
const branches = { defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "feature/login", isDefault: false }] };
const comparison = {
  repository: { _id: id, name: "project" },
  base: { name: "main", head: "m1" }, compare: { name: "feature/login", head: "f1" }, mergeBase: "c1",
  ancestryAvailable: true, ahead: 2, behind: 1,
  commits: [{ id: "f1", hash: "f1hash", message: "Update login form", author: { name: "Puskar" }, createdAt: "2026-07-14T00:00:00Z", branch: "feature/login" }],
  files: [
    { path: "src/Login.jsx", status: "modified", additions: 2, deletions: 1, conflict: true, conflictReason: "both_modified", hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: [{ type: "removed", content: "-old", oldLineNumber: 1, newLineNumber: null }, { type: "added", content: "+new", oldLineNumber: null, newLineNumber: 1 }] }] },
    { path: "image.png", status: "modified", additions: 0, deletions: 0, isBinary: true, conflict: false, hunks: [] },
    { path: "large.txt", status: "added", additions: 0, deletions: 0, tooLarge: true, conflict: false, hunks: [] },
  ],
  summary: { filesChanged: 3, added: 1, modified: 2, deleted: 0, renamed: 0, additions: 2, deletions: 1, hasConflicts: true, conflictCount: 1 },
  warnings: [],
};

const response = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const renderPage = (entry = `/repo/${id}/compare?base=main&compare=feature%2Flogin`) => render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/repo/:id/compare" element={<ComparePage />} /></Routes></MemoryRouter>);

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("ComparePage", () => {
  test("initializes from query, renders summary/tabs/diffs, swaps, and avoids request loops", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url); calls.push(value);
      if (value.endsWith(`/repo/${id}/branches`)) return Promise.resolve(response(branches));
      if (value.includes(`/repo/${id}/compare`)) return Promise.resolve(response({ ...comparison, base: { name: value.includes("base=feature%2Flogin") ? "feature/login" : "main" }, compare: { name: value.includes("compare=main") ? "main" : "feature/login" } }));
      return Promise.resolve(response({ error: "unexpected" }, 500));
    });
    renderPage();
    expect(await screen.findByText(/commits ahead/i)).toBeTruthy();
    expect(screen.getByText("Update login form")).toBeTruthy();
    expect(calls.filter((url) => url.includes(`/repo/${id}/compare?`))).toHaveLength(1);
    fireEvent.click(screen.getByRole("tab", { name: /files changed/i }));
    expect((await screen.findAllByText("-old")).length).toBeGreaterThan(0);
    expect(screen.getByText("C Conflict")).toBeTruthy();
    const binaryHeader = screen.getByText("image.png").closest("button");
    fireEvent.click(binaryHeader);
    expect(screen.getByText("Binary file changed")).toBeTruthy();
    const largeHeader = screen.getByText("large.txt").closest("button");
    fireEvent.click(largeHeader);
    expect(screen.getByText("File is too large for inline diff")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "added" } });
    expect(screen.getByText("large.txt")).toBeTruthy();
    expect(screen.queryByText("image.png")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /swap/i }));
    await waitFor(() => expect(calls.some((url) => url.includes("base=feature%2Flogin&compare=main"))).toBe(true));
  });

  test("handles same-branch queries, empty comparisons, and pull-request placeholder", async () => {
    const empty = { ...comparison, ahead: 0, behind: 0, commits: [], files: [], summary: { ...comparison.summary, filesChanged: 0, additions: 0, deletions: 0, hasConflicts: false, conflictCount: 0 } };
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).endsWith("/branches") ? Promise.resolve(response(branches)) : Promise.resolve(response(empty)));
    renderPage(`/repo/${id}/compare?base=main&compare=main`);
    expect(await screen.findByText("These branches are identical")).toBeTruthy();
    expect(screen.getByText("No commits are unique to the compare branch.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /create pull request/i }).disabled).toBe(true);
  });
});
