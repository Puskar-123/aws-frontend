// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import NewPullRequest from "./NewPullRequest";
import PullRequestList from "./PullRequestList";
import PullRequestPage from "./PullRequestPage";

const id = "507f1f77bcf86cd799439011";
const response = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
const comparison = {
  ancestryAvailable: true,
  commits: [{ id: "f1", hash: "f1hash", message: "Add feature", author: { name: "Dev" }, createdAt: "2026-07-14T00:00:00Z" }],
  files: [{ path: "feature.js", status: "added", additions: 1, deletions: 0, conflict: false, hunks: [] }],
  summary: { filesChanged: 1, additions: 1, deletions: 0, hasConflicts: false, conflictCount: 0 },
};

beforeEach(() => { localStorage.setItem("token", "test-token"); localStorage.setItem("userId", "user-1"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("pull request pages", () => {
  test("new PR initializes query branches, validates, creates, and navigates", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url); calls.push({ url: value, options });
      if (value.endsWith(`/repo/${id}/branches`)) return Promise.resolve(response({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "feature/test" }] }));
      if (value.includes(`/repo/${id}/compare?`)) return Promise.resolve(response(comparison));
      if (value.endsWith(`/repo/${id}/pulls`) && options.method === "POST") return Promise.resolve(response({ pullRequest: { number: 1 } }, 201));
      return Promise.resolve(response({}, 500));
    });
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/new?base=main&compare=feature%2Ftest`]}><Routes><Route path="/repo/:id/pulls/new" element={<><NewPullRequest /><Location /></>} /><Route path="/repo/:id/pulls/:number" element={<Location />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Able to merge")).toBeTruthy();
    expect(screen.getByLabelText("Base branch").value).toBe("main");
    expect(screen.getByLabelText("Compare branch").value).toBe("feature/test");
    expect(screen.getByLabelText("Title").value).toBe("Add feature");
    fireEvent.click(screen.getByRole("button", { name: /^create pull request$/i }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(`/repo/${id}/pulls/1`));
    const create = calls.find((call) => call.options.method === "POST");
    expect(create.options.headers.get("Authorization")).toBe("Bearer test-token");
  });

  test("PR list filters statuses and searches titles", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const closed = String(url).includes("status=closed");
      return Promise.resolve(response({ pullRequests: [{ number: closed ? 2 : 1, title: closed ? "Closed fix" : "Open feature", status: closed ? "closed" : "open", baseBranch: "main", compareBranch: "feature", author: { username: "Dev" } }] }));
    });
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls`]}><Routes><Route path="/repo/:id/pulls" element={<PullRequestList />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Open feature/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(await screen.findByText(/Closed fix/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search pull requests"), { target: { value: "missing" } });
    expect(screen.getByText(/No closed pull requests found/i)).toBeTruthy();
  });

  test("PR detail supports tabs, comments, and owner merge", async () => {
    let merged = false;
    const pullRequest = { number: 1, title: "Add feature", description: "Description", status: "open", author: { username: "Dev" }, baseBranch: "main", compareBranch: "feature", comments: [] };
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith("/comments") && options.method === "POST") return Promise.resolve(response({ comment: { _id: "comment-1", body: "Looks good", author: { username: "Dev" } } }, 201));
      if (value.endsWith("/merge") && options.method === "POST") { merged = true; return Promise.resolve(response({ message: "Pull request merged" })); }
      if (value.endsWith(`/repo/${id}/pulls/1`)) return Promise.resolve(response({ pullRequest: { ...pullRequest, status: merged ? "merged" : "open", mergeCommit: merged ? "mergehash" : null }, comparison, mergeability: { canMerge: !merged, hasConflicts: false, reason: merged ? "Pull request is merged" : null }, permissions: { canEdit: true, canMerge: true, canComment: true } }));
      return Promise.resolve(response({}, 500));
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/1`]}><Routes><Route path="/repo/:id/pulls/:number" element={<PullRequestPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Description" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Add a comment"), { target: { value: "Looks good" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("Looks good")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Commits 1/ }));
    expect(screen.getAllByText("Add feature").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("tab", { name: /Files changed 1/ }));
    expect(screen.getByText("feature.js")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Conversation" }));
    fireEvent.click(screen.getByRole("button", { name: "Merge pull request" }));
    expect(await screen.findByText("Pull request merged")).toBeTruthy();
  });

  test("conflicted PR hides merge action and explains the block", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ pullRequest: { number: 2, title: "Conflict", status: "open", author: { username: "Dev" }, baseBranch: "main", compareBranch: "feature", comments: [] }, comparison: { ...comparison, summary: { ...comparison.summary, hasConflicts: true } }, mergeability: { canMerge: false, hasConflicts: true, reason: "Pull request has merge conflicts" }, permissions: { canEdit: false, canMerge: false, canComment: false } }));
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/2`]}><Routes><Route path="/repo/:id/pulls/:number" element={<PullRequestPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Merge blocked")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Merge pull request" })).toBeNull();
  });
});
