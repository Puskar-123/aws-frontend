// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import NewPullRequest from "./NewPullRequest";
import PullRequestList from "./PullRequestList";
import PullRequestPage from "./PullRequestPage";
import { displayName, initials } from "./pullIdentity";

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
  test("identity helpers use real names, proper initials, and deleted-user fallback", () => {
    expect(displayName({ name: "Puskar Porel" })).toBe("Puskar Porel");
    expect(initials({ name: "Puskar Porel" })).toBe("PP");
    expect(displayName(null)).toBe("Deleted user");
  });
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
    expect(screen.getByText("Target branch receiving changes")).toBeTruthy();
    expect(screen.getByText("Source branch providing changes")).toBeTruthy();
    expect(screen.getByLabelText("Title").value).toBe("Add feature");
    fireEvent.click(screen.getByRole("button", { name: /^create pull request$/i }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(`/repo/${id}/pulls/1`));
    const create = calls.find((call) => call.options.method === "POST");
    expect(create.options.headers.get("Authorization")).toBe("Bearer test-token");
    expect(JSON.parse(create.options.body)).toMatchObject({ baseBranch: "main", compareBranch: "feature/test" });
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
    expect(screen.getByText(/wants to merge/).textContent).toContain("feature into main");
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

  test("merged PR renders preserved counts, author details, and merged panel metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({
      pullRequest: { number: 3, title: "Merged work", status: "merged", author: { name: "Puskar Porel" }, mergedBy: { username: "puskar" }, mergedAt: "2026-07-14T09:00:00Z", mergeCommit: "3784ffdf12345678", baseBranch: "main", compareBranch: "feature", comments: [{ _id: "c1", body: "Done", author: { username: "ananya" }, createdAt: "2026-07-14T08:00:00Z" }], reviews: [] },
      comparison: { ...comparison, isHistorical: true }, comparisonSource: "merge_snapshot", historicalUnavailable: false,
      reviewSummary: { approved: 0, changesRequested: 0, commented: 0, blocking: false, latestByReviewer: [] },
      mergeability: { canMerge: false, hasConflicts: false, reason: "Pull request is merged" }, permissions: { canEdit: false, canMerge: false, canComment: true },
    }));
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/3`]}><Routes><Route path="/repo/:id/pulls/:number" element={<PullRequestPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("tab", { name: "Commits 1" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Files changed 1" })).toBeTruthy();
    expect(screen.getByText("Puskar Porel")).toBeTruthy();
    expect(screen.getByText(/merged commit/)).toBeTruthy();
    expect(screen.getByText("ananya")).toBeTruthy();
  });

  test("legacy merged PR uses unavailable counts instead of misleading zeroes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({
      pullRequest: { number: 4, title: "Legacy", status: "merged", author: null, mergedBy: null, baseBranch: "main", compareBranch: "old", comments: [], reviews: [] },
      comparison: null, historicalUnavailable: true, reviewSummary: { approved: 0, changesRequested: 0, commented: 0, blocking: false, latestByReviewer: [] },
      mergeability: { canMerge: false, hasConflicts: false, reason: "Pull request is merged" }, permissions: { canEdit: false, canMerge: false, canComment: false },
    }));
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/4`]}><Routes><Route path="/repo/:id/pulls/:number" element={<PullRequestPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Historical comparison unavailable/)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Commits —" }).title).toContain("unavailable");
    expect(screen.getAllByText("Deleted user").length).toBeGreaterThan(0);
  });

  test("review form validates, submits decisions, refreshes summary, and blocks merge", async () => {
    let reviewed = false;
    const detail = () => ({
      pullRequest: { number: 5, title: "Review me", status: "open", author: { _id: "author", username: "dev" }, baseBranch: "main", compareBranch: "feature", comments: [], reviews: reviewed ? [{ _id: "r1", reviewer: { username: "owner" }, decision: "changes_requested", body: "Fix this", createdAt: "2026-07-14T00:00:00Z" }] : [] },
      comparison, historicalUnavailable: false,
      reviewSummary: { approved: 0, changesRequested: reviewed ? 1 : 0, commented: 0, blocking: reviewed, latestByReviewer: reviewed ? [{ _id: "r1", reviewer: { username: "owner" }, decision: "changes_requested", body: "Fix this", stale: false }] : [] },
      mergeability: { canMerge: !reviewed, hasConflicts: false, blockedByReviews: reviewed, reason: reviewed ? "Merge blocked by requested changes" : null },
      permissions: { canEdit: true, canMerge: true, canComment: true, canReviewDecision: true, isAuthor: false },
    });
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      if (String(url).endsWith("/reviews") && options.method === "POST") { reviewed = true; return Promise.resolve(response({ review: { decision: "changes_requested" } }, 201)); }
      return Promise.resolve(response(detail()));
    });
    render(<MemoryRouter initialEntries={[`/repo/${id}/pulls/5`]}><Routes><Route path="/repo/:id/pulls/:number" element={<PullRequestPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Submit a review" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Request changes"));
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect(await screen.findByText("Review text is required for this decision.")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Review summary" }), { target: { value: "Fix this" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit review" }));
    expect((await screen.findAllByText("Changes requested")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Merge blocked" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Merge pull request" })).toBeNull();
  });
});
