// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import PullRequestFiles from "./PullRequestFiles";
import PullRequestPage from "./PullRequestPage";
import RequestedReviewers from "./RequestedReviewers";

const id = "507f1f77bcf86cd799439011";
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const thread = { _id: "t1", filePath: "src/app.js", side: "RIGHT", line: 2, resolved: false, outdated: false, createdBy: { _id: "reviewer", username: "reviewer" }, comments: [{ _id: "c1", author: { _id: "reviewer", username: "reviewer" }, body: "Use the shared helper" }] };
const fileData = { files: [
  { path: "src/app.js", status: "modified", additions: 1, deletions: 0, threads: [thread], hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: [{ type: "context", content: " const a = 1", oldLineNumber: 1, newLineNumber: 1 }, { type: "added", content: "+const b = 2", oldLineNumber: null, newLineNumber: 2 }] }] },
  { path: "logo.png", status: "modified", additions: 0, deletions: 0, binary: true, isBinary: true, threads: [], hunks: [] },
], summary: { filesChanged: 2, additions: 1, deletions: 0 }, headCommit: "head-1", baseCommit: "base" };
const mergeStatus = { mergeable: false, unresolvedConversations: 1, checks: [{ name: "Required approvals", passed: false, message: "0 of 1 approvals" }, { name: "Review conversations", passed: false, message: "1 unresolved conversation" }] };
const pull = { number: 1, status: "open", author: { _id: "author", username: "author" }, baseBranch: "main", compareBranch: "feature" };
const permissions = { currentUserId: "reviewer", canComment: true, canReviewDecision: true, isAuthor: false };

beforeEach(() => { localStorage.clear(); localStorage.setItem("token", "test-token"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("advanced pull request review", () => {
  test("files tab renders stable diff lines, binary state, threads, collapse, and merge checks", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(response(String(url).endsWith("merge-status") ? mergeStatus : fileData)));
    render(<PullRequestFiles repositoryId={id} pullRequest={pull} permissions={permissions} onReview={vi.fn()} />);
    expect(await screen.findByText("src/app.js")).toBeTruthy();
    expect(screen.getByText("Binary file changed. Line comments are unavailable.")).toBeTruthy();
    expect(screen.getByText("Use the shared helper")).toBeTruthy();
    expect(screen.getByText("0 of 1 approvals")).toBeTruthy();
    expect(screen.getByText("1 unresolved conversation")).toBeTruthy();
    const collapse = screen.getByRole("button", { name: "Collapse src/app.js" });
    fireEvent.click(collapse); expect(screen.getByRole("button", { name: "Expand src/app.js" })).toBeTruthy();
  });

  test("line comments validate locally, submit current head, and stale API errors remain visible", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      calls.push({ url: String(url), options });
      if (options.method === "POST" && String(url).endsWith("/threads")) return Promise.resolve(response({ error: "The pull request changed while you were reviewing it. Reload before submitting.", code: "STALE_REVIEW" }, 409));
      return Promise.resolve(response(String(url).endsWith("merge-status") ? mergeStatus : fileData));
    });
    render(<PullRequestFiles repositoryId={id} pullRequest={pull} permissions={permissions} onReview={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Add comment on src/app.js line 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    expect(screen.getByRole("alert").textContent).toContain("Comment is required");
    fireEvent.change(screen.getByLabelText("Comment on line 2"), { target: { value: "Please update this" } });
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByText(/pull request changed while you were reviewing/)).toBeTruthy();
    const submitted = calls.find((call) => call.options.method === "POST");
    expect(JSON.parse(submitted.options.body).commitHash).toBe("head-1");
  });

  test("reply and resolve controls call thread APIs", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => { calls.push({ url: String(url), method: options.method || "GET" }); return Promise.resolve(response(String(url).endsWith("merge-status") ? mergeStatus : fileData)); });
    render(<PullRequestFiles repositoryId={id} pullRequest={pull} permissions={permissions} onReview={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Reply" }));
    fireEvent.change(screen.getByLabelText("Reply"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/threads/t1/comments") && call.method === "POST")).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Resolve conversation" }));
    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/threads/t1/resolve") && call.method === "PATCH")).toBe(true));
  });

  test("Review changes opens the submission panel and sends the reviewed head", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/reviews") && options.method === "POST") return Promise.resolve(response({ review: { decision: "approved" } }, 201));
      return Promise.resolve(response(String(url).endsWith("merge-status") ? mergeStatus : fileData));
    });
    render(<PullRequestFiles repositoryId={id} pullRequest={pull} permissions={permissions} onReview={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review changes" }));
    expect(screen.getByRole("heading", { name: "Submit a review" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Approve"));
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    await waitFor(() => expect(calls.some((call) => call.url.endsWith("/reviews") && call.options.method === "POST")).toBe(true));
    const reviewCall = calls.find((call) => call.url.endsWith("/reviews") && call.options.method === "POST");
    expect(JSON.parse(reviewCall.options.body).reviewedCommit).toBe("head-1");
  });

  test("reviewer picker renders status, requests candidates, and reports duplicate errors", async () => {
    let requested = false;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options = {}) => {
      if (options.method === "POST") { requested = true; return Promise.resolve(response({ error: "Review has already been requested from this user" }, 409)); }
      return Promise.resolve(response({ requestedReviewers: requested ? [] : [{ _id: "rq1", user: { _id: "u1", username: "AccountB" }, status: "requested" }], candidates: [{ _id: "u2", username: "AccountC", role: "maintainer" }] }));
    });
    render(<RequestedReviewers repositoryId={id} number={1} canManage />);
    expect(await screen.findByText("AccountB")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Request reviewer"), { target: { value: "u2" } });
    expect(await screen.findByText("Review has already been requested from this user")).toBeTruthy();
  });

  test("tab selection is URL-backed so browser history can restore Files changed", async () => {
    const detail = { pullRequest: { ...pull, title: "Advanced review", comments: [], reviews: [] }, comparison: { files: [], commits: [], summary: {} }, historicalUnavailable: false, reviewSummary: { latestByReviewer: [] }, mergeability: { canMerge: false, hasConflicts: false }, permissions };
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(response(String(url).endsWith("/files") ? fileData : String(url).endsWith("merge-status") ? mergeStatus : detail)));
    const Location = () => <output data-testid="location">{useLocation().search}</output>;
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/1?tab=files`]}><Routes><Route path="/repo/:id/pulls/:number" element={<><PullRequestPage /><Location /></>} /></Routes></MemoryRouter>);
    expect((await screen.findByRole("tab", { name: /Files changed/ })).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("location").textContent).toBe("?tab=files");
    fireEvent.keyDown(screen.getByRole("tab", { name: /Files changed/ }), { key: "ArrowLeft" });
    expect(screen.getByTestId("location").textContent).toBe("?tab=commits");
  });
});
