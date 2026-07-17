// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import InsightsPage from "./InsightsPage";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
const id = "507f1f77bcf86cd799439011";
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const fixtures = {
  health: { score: 72, status: "needs_improvement", insufficientData: false, version: 1, range: "30d", calculatedAt: "2026-07-17T00:00:00Z", recommendations: ["Configure a test workflow"], categories: { automatedTests: { label: "Automated tests", score: 12, max: 20, details: [{ label: "Latest test workflow", points: 0, max: 8, status: "not_configured", evidence: "Not configured", recommendation: "Configure a test workflow" }] } } },
  overview: { summary: { commits: 45, contributors: 3, branches: 2, openIssues: 2, mergedPullRequests: 6, stars: 4, forks: 2, watchers: 3 } },
  commits: { interval: "day", totalCommits: 3, timezone: "UTC", series: [{ date: "2026-07-13", commits: 1 }, { date: "2026-07-14", commits: 2 }] },
  languages: { totalBytes: 1000, languages: [{ name: "JavaScript", bytes: 650, percentage: 65 }, { name: "CSS", bytes: 350, percentage: 35 }] },
  issues: { summary: { open: 2, closed: 8, averageResolutionHours: 18.4 }, openedSeries: [{ _id: "2026-07-14", count: 2 }], closedSeries: [{ _id: "2026-07-14", count: 1 }] },
  "pull-requests": { summary: { open: 1, closed: 2, merged: 6, averageMergeHours: 12.7, averageReviewHours: 4.3 }, openedSeries: [{ _id: "2026-07-14", count: 1 }], mergedSeries: [{ _id: "2026-07-14", count: 2 }] },
  branches: { branches: [{ name: "main", commits: 30, protected: true, isDefault: true, lastCommitAt: "2026-07-14T00:00:00Z" }, { name: "feature", commits: 2 }] },
  activity: { items: [{ type: "commit", actor: { username: "Puskar" }, title: "Committed to main", message: "Fix auth", createdAt: "2026-07-14T00:00:00Z", url: `/repo/${id}?branch=main` }], pagination: { page: 1, hasMore: true } },
  files: { files: [{ path: "src/Login.jsx", changes: 14, lastChangedAt: "2026-07-14T00:00:00Z" }] },
  contributors: { contributors: [{ name: "Puskar", commits: 18, additions: 420, deletions: 120, filesChanged: 36, lastContributionAt: "2026-07-14T00:00:00Z" }], pagination: { page: 1, total: 1 } },
};
const endpoint = (url) => Object.keys(fixtures).sort((a, b) => b.length - a.length).find((key) => String(url).split("?")[0].endsWith(`/insights/${key}`));
const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
function renderPage(view = "overview", path = `/repo/${id}/insights?range=30d`) { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/repo/:id/insights/*" element={<><InsightsPage view={view} /><Location /></>} /><Route path="/repo/:id/insights" element={<><InsightsPage view={view} /><Location /></>} /></Routes></MemoryRouter>); }

beforeEach(() => { localStorage.clear(); localStorage.setItem("token", "test-token"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("repository insights", () => {
  test("overview renders accurate cards, chart, languages, issue/PR metrics, activity, and changed files", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(response(fixtures[endpoint(url)])));
    renderPage();
    expect(screen.getByText("Loading repository insights...")).toBeTruthy();
    expect(await screen.findByText("45")).toBeTruthy();
    expect(screen.getAllByText("Commits").length).toBeGreaterThan(0); expect(screen.getByText("JavaScript")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Commit activity/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Issue activity/ })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Pull request activity/ })).toBeTruthy();
    expect(screen.getByText("Fix auth")).toBeTruthy(); expect(screen.getByText("src/Login.jsx")).toBeTruthy();
    expect(screen.getByText("18.4 hours")).toBeTruthy(); expect(screen.getByText("12.7 hours")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Project health score 72 out of 100" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Automated tests/ })); expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);
  });

  test("range selector updates URL, refreshes requests, and preserves the active tab", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => { calls.push(String(url)); return Promise.resolve(response(fixtures[endpoint(url)])); });
    renderPage("overview"); await screen.findByText("45");
    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "90d" } });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("range=90d"));
    await waitFor(() => expect(calls.some((url) => url.includes("range=90d"))).toBe(true));
    expect(screen.getByRole("link", { name: "Commits" }).getAttribute("href")).toContain("range=90d");
    expect(calls.length).toBeLessThanOrEqual(20);
  });

  test("commit page filters by branch using URL state", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => { calls.push(String(url)); return Promise.resolve(response(fixtures[endpoint(url)])); });
    renderPage("commits", `/repo/${id}/insights/commits?range=30d`);
    await screen.findByRole("img", { name: /Commit activity/ });
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "main" } });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("branch=main"));
    await waitFor(() => expect(calls.some((url) => url.includes("branch=main"))).toBe(true));
  });

  test("contributors table renders reliable values and accessible headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(fixtures.contributors)); renderPage("contributors", `/repo/${id}/insights/contributors?range=30d`);
    expect(await screen.findByRole("columnheader", { name: "Contributor" })).toBeTruthy(); expect(screen.getByText("Puskar")).toBeTruthy(); expect(screen.getByText("420")).toBeTruthy();
  });

  test("activity filters and paginates through URL parameters", async () => {
    const calls = []; vi.spyOn(globalThis, "fetch").mockImplementation((url) => { calls.push(String(url)); return Promise.resolve(response(fixtures.activity)); });
    renderPage("activity", `/repo/${id}/insights/activity?range=30d`); await screen.findByText("Fix auth");
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "commits" } });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("type=commits"));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("page=2"));
    expect(calls.some((url) => url.includes("type=commits"))).toBe(true);
  });

  test("empty states are explicit", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => { const key = endpoint(url); return Promise.resolve(response(key === "overview" ? { summary: {} } : key === "commits" ? { series: [], totalCommits: 0 } : key === "languages" ? { languages: [] } : key === "activity" ? { items: [] } : key === "files" ? { files: [] } : fixtures[key])); });
    renderPage(); expect(await screen.findByText("No commit activity in this range.")).toBeTruthy(); expect(screen.getByText(/Language statistics will appear/)).toBeTruthy(); expect(screen.getByText("No recent repository activity.")).toBeTruthy();
  });

  test("API and network errors remain inline and Retry reloads", async () => {
    let failed = true; const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => failed ? Promise.resolve(response({ error: "Unable to calculate insights" }, 500)) : Promise.resolve(response(fixtures[endpoint(url)])));
    renderPage(); expect((await screen.findByRole("alert")).textContent).toContain("Unable to calculate insights");
    failed = false; fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(await screen.findByText("45")).toBeTruthy(); expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  test("private unauthorized responses are displayed without inventing data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ error: "You do not have access to this repository" }, 403)); renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain("You do not have access to this repository"); expect(screen.queryByText("45")).toBeNull();
  });
});
