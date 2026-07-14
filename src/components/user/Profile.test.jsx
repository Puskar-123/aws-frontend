// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider } from "../../authContext";
import Profile from "./Profile";

const userId = "507f1f77bcf86cd799439011";
const profileResponse = {
  user: {
    _id: userId,
    name: "Puskar Porel",
    username: "puskar",
    bio: "MERN developer",
    avatarUrl: "",
    location: "Kolkata",
    website: "https://example.com/",
    company: "CodeHub",
    createdAt: "2026-03-01T00:00:00.000Z",
    followersCount: 2,
    followingCount: 3,
  },
  stats: { repositories: 2, publicRepositories: 1, privateRepositories: 1, commits: 3, contributions: 5 },
  repositories: [
    { _id: "repo-alpha", name: "Alpha", description: "Frontend project", visibility: "public", content: [], commits: [{}, {}] },
    { _id: "repo-beta", name: "Beta", description: "Private API", visibility: "private", content: [], commits: [{}] },
  ],
  popularRepositories: [
    { _id: "repo-alpha", name: "Alpha", description: "Frontend project", visibility: "public", content: [], commits: [{}, {}] },
  ],
  recentActivity: [{ type: "commit", repositoryId: "repo-alpha", repositoryName: "Alpha", message: "Update UI", createdAt: "2026-07-14T10:00:00.000Z" }],
  contributions: [{ date: "2026-07-14", count: 5 }],
  starredRepositories: [],
};

const response = (body, ok = true, status = ok ? 200 : 500) => ({
  ok,
  status,
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const Location = () => <output data-testid="location">{useLocation().pathname}</output>;
const renderProfile = () => render(
  <MemoryRouter initialEntries={["/profile"]}>
    <AuthProvider><Profile /><Location /></AuthProvider>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.setItem("userId", userId);
  localStorage.setItem("token", "token");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Profile", () => {
  test("shows loading then renders real profile, stats, initials, and contributions", async () => {
    let resolveFetch;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    renderProfile();
    expect(screen.getByText("Loading profile...")).toBeTruthy();

    resolveFetch(response(profileResponse));
    expect(await screen.findByRole("heading", { name: "Puskar Porel" })).toBeTruthy();
    expect(screen.getByText("PP")).toBeTruthy();
    expect(screen.getByText("5 contributions in 2026")).toBeTruthy();
    expect(screen.getByText(/pushed “Update UI”/)).toBeTruthy();
  });

  test("renders a retryable error state", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: "Profile unavailable" }, false, 500))
      .mockResolvedValueOnce(response(profileResponse));
    renderProfile();
    expect(await screen.findByText("Profile unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Puskar Porel" })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("edit modal cancels safely, validates URLs, and saves allowed profile fields", async () => {
    const updatedUser = { ...profileResponse.user, name: "Updated Name" };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response(profileResponse))
      .mockResolvedValueOnce(response({ user: updatedUser }));
    renderProfile();
    await screen.findByRole("heading", { name: "Puskar Porel" });

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Cancelled Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Puskar Porel" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Website/ }), { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Website must use http or https.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole("textbox", { name: /Website/ }), { target: { value: "https://example.com" } });
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Updated Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Updated Name" })).toBeTruthy();
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });

  test("tabs search real repositories, show the stars empty state, navigate safely, and logout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response(profileResponse));
    renderProfile();
    await screen.findByRole("heading", { name: "Puskar Porel" });

    fireEvent.click(screen.getAllByRole("button", { name: "Alpha" })[0]);
    expect(screen.getByTestId("location").textContent).toBe("/repo/repo-alpha");

    fireEvent.click(screen.getByRole("button", { name: /Repositories/ }));
    fireEvent.change(screen.getByPlaceholderText("Search repositories..."), { target: { value: "Private API" } });
    expect(screen.getByRole("button", { name: "Beta" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Stars/ }));
    expect(screen.getByText("No starred repositories yet.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(localStorage.getItem("userId")).toBeNull());
    expect(screen.getByTestId("location").textContent).toBe("/login");
  });
});
