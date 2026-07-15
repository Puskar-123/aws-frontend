// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import Dashboard from "./Dashboard";
import DashboardStats from "./DashboardStats";
import GettingStarted from "./GettingStarted";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
const jsonResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const dashboardPayload = {
  statistics: { repositories: 2, publicRepositories: 1, privateRepositories: 1, commits: 47 },
  myRepositories: [{ _id: "repo-1", name: "Alpha", visibility: "public" }, { _id: "repo-2", name: "Private work", visibility: "private" }],
  sharedRepositories: [],
};

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

test("Getting Started uses the published package and complete modern workflow", () => {
  render(<MemoryRouter><GettingStarted /></MemoryRouter>);
  expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy(); expect(screen.getByText("codehub login")).toBeTruthy();
  expect(screen.getByText(/codehub clone Owner\/Repository/)).toBeTruthy(); expect(screen.getByText(/codehub branch feature\/my-change/)).toBeTruthy();
  expect(screen.queryByText(/codehub init --repo/)).toBeNull();
  expect(screen.getByRole("link", { name: /View full CLI documentation/ }).getAttribute("href")).toBe("/docs/cli");
  expect(document.querySelector(".dashboard-getting-started pre")).toBeTruthy();
});

describe("Dashboard backend statistics", () => {
  test("renders a non-zero backend commit total without recomputing repository cards", async () => {
    localStorage.setItem("userId", "user-1"); localStorage.setItem("token", "token"); let repositoryRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/repo/user/")) { repositoryRequests += 1; return jsonResponse(dashboardPayload); }
      if (String(url).includes("/user/profile/")) return jsonResponse({ user: { username: "Puskar" } });
      return jsonResponse({ repositories: [{ _id: "explore-1", name: "Community", visibility: "public", owner: { username: "other" } }] });
    });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(document.querySelectorAll(".dashboard-skeleton--stat").length).toBe(4); expect(await screen.findByText("47")).toBeTruthy();
    expect(screen.getByText("Community")).toBeTruthy(); fireEvent.change(screen.getByPlaceholderText("Search your repositories..."), { target: { value: "Alpha" } });
    expect(screen.getByText("Alpha")).toBeTruthy(); expect(screen.queryByText("Private work")).toBeNull(); await waitFor(() => expect(repositoryRequests).toBe(1));
  });

  test("announces statistics errors and Retry requests fresh backend data", async () => {
    localStorage.setItem("userId", "user-1"); let attempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (!String(url).includes("/repo/user/")) return jsonResponse({ repositories: [] }); attempts += 1;
      return attempts === 1 ? jsonResponse({ error: "failed" }, 500) : jsonResponse({ ...dashboardPayload, statistics: { ...dashboardPayload.statistics, commits: 8 } });
    });
    render(<MemoryRouter><Dashboard /></MemoryRouter>); expect(await screen.findByText("Unable to load repository statistics.")).toBeTruthy();
    fireEvent.click(document.querySelector(".dashboard-stats-error button")); expect(await screen.findByText("8")).toBeTruthy(); expect(attempts).toBe(2);
  });

  test("invalid statistics are reported instead of silently displayed as zero", async () => {
    localStorage.setItem("userId", "user-1");
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/repo/user/")) return jsonResponse({ ...dashboardPayload, statistics: { commits: 0 } });
      return jsonResponse({ repositories: [] });
    });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText("Unable to load repository statistics.")).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });
});

test("statistics exposes loading, zero, and retry states without inventing values", () => {
  const retry = vi.fn(); const view = render(<DashboardStats loading />); expect(view.container.querySelectorAll(".dashboard-skeleton--stat").length).toBe(4);
  view.rerender(<DashboardStats statistics={{ repositories: 0, publicRepositories: 0, privateRepositories: 0, commits: 0 }} />); expect(screen.getAllByText("0").length).toBe(4);
  view.rerender(<DashboardStats error onRetry={retry} />); fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
});
