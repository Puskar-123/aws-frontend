// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import IssueList from "./IssueList";
import NewIssue from "./NewIssue";
import IssuePage from "./IssuePage";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
vi.mock("../repository/MarkdownPreview", () => ({ default: ({ content }) => <p>{content}</p> }));

const jsonResponse = (body, ok = true, status = ok ? 200 : 400) => ({
  ok, status,
  headers: { get: () => "application/json" },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});
const author = { _id: "user-1", username: "puskar", name: "Puskar" };
const issue = { _id: "issue-1", number: 12, title: "Fix repository tree refresh", body: "Steps to reproduce", status: "open", priority: "high", labels: [{ name: "bug", color: "d73a4a" }], author, assignees: [], linkedPullRequests: [], comments: [], createdAt: "2026-07-14T10:00:00.000Z", updatedAt: "2026-07-14T10:00:00.000Z" };
const Location = () => <output data-testid="location">{useLocation().pathname}</output>;

beforeEach(() => { localStorage.setItem("token", "test-token"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("Issues", () => {
  test("lists issues and refetches for closed status and search", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ issues: [issue], counts: { open: 1, closed: 0, total: 1 }, pagination: { page: 1, pages: 1, total: 1 } }));
    render(<MemoryRouter initialEntries={["/repo/repo-1/issues"]}><Routes><Route path="/repo/:id/issues" element={<IssueList />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: /Fix repository tree refresh/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Closed/ }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("status=closed"))).toBe(true));
    fireEvent.change(screen.getByPlaceholderText("Search issues..."), { target: { value: "navbar" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("search=navbar"))).toBe(true));
  });

  test("validates and creates an issue without losing entered content", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ issue }));
    render(<MemoryRouter initialEntries={["/repo/repo-1/issues/new"]}><Routes><Route path="/repo/:id/issues/new" element={<><NewIssue /><Location /></>} /><Route path="/repo/:id/issues/:number" element={<Location />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Submit new issue" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Title is required");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: issue.title } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: issue.body } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "high" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit new issue" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/repo/repo-1/issues/12"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ title: issue.title, body: issue.body, priority: "high" });
  });

  test("renders issue details, submits a comment, and closes the issue", async () => {
    const closed = { ...issue, status: "closed", closedAt: "2026-07-14T11:00:00.000Z" };
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      if (String(url).endsWith("/comments")) return Promise.resolve(jsonResponse({ comment: { _id: "comment-1", author, body: "I can reproduce this.", createdAt: issue.createdAt } }));
      if (String(url).endsWith("/close")) return Promise.resolve(jsonResponse({ issue: closed }));
      return Promise.resolve(jsonResponse({ issue, permissions: { canComment: true, canEdit: true } }));
    });
    render(<MemoryRouter initialEntries={["/repo/repo-1/issues/12"]}><Routes><Route path="/repo/:id/issues/:number" element={<IssuePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /Fix repository tree refresh/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Add a comment"), { target: { value: "I can reproduce this." } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("I can reproduce this.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close issue" }));
    expect(await screen.findByText("closed")).toBeTruthy();
  });
});
