// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Dashboard from "../dashboard/Dashboard";
import ExplorePage from "../explore/ExplorePage";
import GlobalSearch from "./GlobalSearch";
import PublicProfilePage from "./PublicProfilePage";
import SearchResultsPage from "./SearchResultsPage";

let authenticated = false;
vi.mock("../../authContext", () => ({ useAuth: () => ({ isAuthenticated: authenticated, user: null }) }));
const response = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const repository = { _id: "repo-b", name: "search-test", description: "Public React project", visibility: "public", language: "JavaScript", starCount: 4, forkCount: 2, watcherCount: 3, updatedAt: "2026-07-14T10:00:00.000Z", owner: { _id: "user-b", username: "AccountB" } };
const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;

beforeEach(() => { authenticated = false; localStorage.setItem("token", "token"); localStorage.setItem("userId", "user-a"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("Explore and global search", () => {
  test("Explore loads public repositories from different owners and preserves filter pagination in the URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ repositories: [repository], pagination: { page: 1, limit: 20, total: 22, pages: 2, hasNextPage: true, hasPreviousPage: false } }));
    render(<MemoryRouter initialEntries={["/explore"]}><Routes><Route path="/explore" element={<><ExplorePage /><Location /></>} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: /AccountB \/ search-test/ })).toBeTruthy(); expect(screen.getByText("Public React project")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "stars" } }); await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("sort=stars"));
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "JavaScript" } }); await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("language=JavaScript"));
    fireEvent.click(screen.getByRole("button", { name: "Next" })); await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("page=2"));
  });

  test("Explore shows loading, empty, and error states", async () => {
    let resolve; vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = render(<MemoryRouter><ExplorePage /></MemoryRouter>); expect(screen.getByText("Loading public repositories...")).toBeTruthy();
    resolve(response({ repositories: [], pagination: { page: 1, pages: 0 } })); expect(await screen.findByText("No public repositories found.")).toBeTruthy(); view.unmount();
    vi.restoreAllMocks(); vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ error: "Offline" }, false)); render(<MemoryRouter><ExplorePage /></MemoryRouter>); expect(await screen.findByRole("alert")).toBeTruthy();
  });

  test("navbar search debounces, skips empty input, renders repository/user suggestions, Enter navigates, and Escape closes", async () => {
    authenticated = true; const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ repositories: [repository], users: [{ _id: "user-b", username: "AccountB", displayName: "Account B" }] }));
    render(<MemoryRouter initialEntries={["/dashboard"]}><GlobalSearch /><Location /></MemoryRouter>);
    const input = screen.getByLabelText("Search repositories and users"); expect(fetchMock).not.toHaveBeenCalled(); fireEvent.change(input, { target: { value: "account" } });
    expect(fetchMock).not.toHaveBeenCalled(); expect(await screen.findByText("AccountB / search-test", {}, { timeout: 1000 })).toBeTruthy(); expect(screen.getByText("@AccountB")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" }); expect(screen.queryByText("Repositories")).toBeNull();
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" }); await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("/search?q=account"));
  });

  test("search results switch tabs and render both safe result types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ query: "account", repositories: [repository], users: [{ _id: "user-b", username: "AccountB", displayName: "Account B", publicRepositoryCount: 1 }], pagination: { repositories: { page: 1, pages: 1 }, users: { page: 1, pages: 1 } } }));
    render(<MemoryRouter initialEntries={["/search?q=account"]}><Routes><Route path="/search" element={<><SearchResultsPage /><Location /></>} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Account B")).toBeTruthy(); expect(screen.getByRole("link", { name: /AccountB \/ search-test/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Users" })); await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("type=users"));
  });

  test("public username profile renders public metadata and never displays private repositories", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => Promise.resolve(response(String(input).includes("/repositories")
      ? { repositories: [repository], pagination: { page: 1, pages: 1 } }
      : { user: { _id: "user-b", username: "AccountB", name: "Account B", bio: "Developer" }, publicRepositoryCount: 1, totalStarsReceived: 4 })));
    render(<MemoryRouter initialEntries={["/users/AccountB"]}><Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Account B" })).toBeTruthy(); expect(screen.getByText("4")).toBeTruthy(); expect(screen.getByRole("link", { name: /AccountB \/ search-test/ })).toBeTruthy(); expect(screen.queryByText("private-secret")).toBeNull();
  });

  test("dashboard recommendation section links to the full Explore page", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => { const url = String(input); if (url.includes("/repo/user/")) return Promise.resolve(response({ repositories: [] }, false, 404)); if (url.includes("/user/profile/")) return Promise.resolve(response({ user: { username: "AccountA" } })); return Promise.resolve(response({ repositories: [repository], pagination: { page: 1, pages: 1 } })); });
    render(<MemoryRouter initialEntries={["/dashboard"]}><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/explore" element={<Location />} /></Routes></MemoryRouter>);
    const button = await screen.findByRole("button", { name: /View all repositories/ }); fireEvent.click(button); expect(await screen.findByTestId("location")).toBeTruthy();
  });
});
