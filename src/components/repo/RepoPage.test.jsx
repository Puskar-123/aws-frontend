// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import RepoPage from "./RepoPage";

const repositoryId = "507f1f77bcf86cd799439011";
const ownerId = "507f1f77bcf86cd799439012";

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => "application/json" },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const LocationState = () => <output data-testid="location-search">{useLocation().search}</output>;

const renderPage = (entry = `/repo/${repositoryId}`) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes><Route path="/repo/:id" element={<><RepoPage /><LocationState /></>} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("userId", ownerId);
  localStorage.setItem("token", "test-token");
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("RepoPage branch integration", () => {
  test("switching branches replaces files and history without request loops", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      calls.push(value);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", owner: { _id: ownerId, username: "developer" }, visibility: "public", description: "" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true, commitCount: 2 }, { name: "feature/login", isDefault: false, commitCount: 1 }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ branch: "main", files: [{ filename: "README.md", path: "README.md" }] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ branch: "main", commits: [{ hash: "m1", message: "Main commit", author: { name: "Dev" } }, { hash: "m0", message: "Initial", author: { name: "Dev" } }] }));
      if (value.includes("/branches/feature%2Flogin/snapshot")) return Promise.resolve(jsonResponse({ branch: "feature/login", files: [{ filename: "login.js", path: "src/login.js" }] }));
      if (value.includes("/branches/feature%2Flogin/history")) return Promise.resolve(jsonResponse({ branch: "feature/login", commits: [{ hash: "f1", message: "Feature commit", author: { name: "Dev" } }] }));
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "content", contentType: "text/plain", previewSupported: true }));
      return Promise.resolve(jsonResponse({ error: `Unexpected URL ${value}` }, 500));
    });

    renderPage();
    expect((await screen.findAllByText("README.md")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Main commit")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("option", { name: /feature\/login/i }));
    expect((await screen.findAllByText("login.js")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Feature commit")).toBeTruthy();
    expect(screen.queryAllByText("README.md")).toHaveLength(0);
    await waitFor(() => {
      expect(calls.filter((url) => url.endsWith(`/repo/${repositoryId}/branches`))).toHaveLength(1);
      expect(calls.filter((url) => url.includes("/branches/feature%2Flogin/snapshot"))).toHaveLength(1);
      expect(calls.filter((url) => url.includes("/branches/feature%2Flogin/history"))).toHaveLength(1);
    });
  });

  test("a valid branch query wins during initialization and an empty snapshot is clear", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", owner: { _id: ownerId }, visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "empty", isDefault: false }] }));
      if (value.includes("/branches/empty/snapshot")) return Promise.resolve(jsonResponse({ branch: "empty", files: [] }));
      if (value.includes("/branches/empty/history")) return Promise.resolve(jsonResponse({ branch: "empty", commits: [] }));
      return Promise.resolve(jsonResponse({ content: "" }));
    });
    renderPage(`/repo/${repositoryId}?branch=empty`);
    expect(await screen.findByText("This branch has no files")).toBeTruthy();
    expect(await screen.findByText("No commits on this branch yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /empty/i })).toBeTruthy();
  });

  test("ownerId fallback creates, selects, and loads a slash-named branch without navigation", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      calls.push({ url: value, method: options.method || "GET" });
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", ownerId, visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`) && options.method === "POST") {
        return Promise.resolve(jsonResponse({ branch: { name: "feature/test", head: "m1", isDefault: false, commitCount: 1 } }, 201));
      }
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true, commitCount: 1 }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: [{ filename: "README.md", path: "README.md" }] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "m1", message: "Initial", author: { name: "Dev" } }] }));
      if (value.includes("/branches/feature%2Ftest/snapshot")) return Promise.resolve(jsonResponse({ files: [{ filename: "feature.js", path: "src/feature.js" }] }));
      if (value.includes("/branches/feature%2Ftest/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "m1", message: "Initial", author: { name: "Dev" } }] }));
      return Promise.resolve(jsonResponse({ error: `Unexpected URL ${value}` }, 500));
    });

    renderPage();
    expect((await screen.findAllByText("README.md")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("button", { name: /new branch/i }));
    expect(screen.getByLabelText("Source branch").value).toBe("main");
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "feature/test" } });
    fireEvent.click(screen.getByRole("button", { name: /^create branch$/i }));

    expect((await screen.findAllByText("feature.js")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("location-search").textContent).toContain("branch=feature%2Ftest");
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compare" }).disabled).toBe(false);
    expect(calls.filter((call) => call.method === "POST" && call.url.endsWith(`/repo/${repositoryId}/branches`))).toHaveLength(1);
    expect(calls.filter((call) => call.url.includes("/branches/feature%2Ftest/snapshot"))).toHaveLength(1);
    expect(calls.filter((call) => call.url.includes("/branches/feature%2Ftest/history"))).toHaveLength(1);
  });
});
