// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import RepoPage from "./RepoPage";
import AddFileMenu from "./AddFileMenu";
import { RepoContent, RepoHeader } from "./RepositoryPageShell";
import { repositoryDescription } from "./repositoryPageUtils";

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
const NavigateToRepository = ({ id }) => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(`/repo/${id}`)}>Open next repository</button>;
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

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
  test("empty branch shows only Quick Setup and creating a file restores the normal browser", async () => {
    let created = false; let snapshotRequests = 0; let historyRequests = 0; let branchRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "empty-project", owner: { _id: ownerId, username: "Puskar" }, visibility: "public", currentUserRole: "owner", permissions: { canEditFiles: true, canUploadFiles: true, canDeleteFiles: true, canRenameFiles: true, canDeleteBranch: true, canManageCollaborators: true } }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) { branchRequests += 1; return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true, head: created ? "c1" : null, commitCount: created ? 1 : 0, state: { isEmpty: !created, fileCount: created ? 1 : 0, commitCount: created ? 1 : 0 }, protection: { protected: false } }] })); }
      if (value.includes("/branches/main/snapshot")) { snapshotRequests += 1; return Promise.resolve(jsonResponse({ branch: "main", state: { isEmpty: !created, fileCount: created ? 1 : 0, commitCount: created ? 1 : 0 }, files: created ? [{ filename: "README.md", path: "README.md", contentType: "text/markdown" }] : [] })); }
      if (value.includes("/branches/main/history")) { historyRequests += 1; return Promise.resolve(jsonResponse({ branch: "main", commits: created ? [{ hash: "c1", message: "Initial commit", branch: "main", author: { name: "Puskar" }, time: new Date().toISOString(), files: [{ path: "README.md" }] }] : [] })); }
      if (value.endsWith(`/repo/${repositoryId}/file-editor`) && options.method === "POST") { created = true; return Promise.resolve(jsonResponse({ file: { path: "README.md", branch: "main" }, commit: { hash: "c1", message: "Initial commit" }, state: { isEmpty: false, fileCount: 1, commitCount: 1 } }, 201)); }
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "# empty-project\n", contentType: "text/markdown", previewSupported: true }));
      if (value.includes("/issues") || value.includes("/pulls")) return Promise.resolve(jsonResponse({ counts: { open: 0 }, pagination: { total: 0 } }));
      return Promise.resolve(jsonResponse({}));
    });

    renderPage();
    expect(await screen.findByRole("heading", { name: "Quick setup" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(`/repo/${repositoryId}/settings/collaborators`);
    expect(screen.getByRole("link", { name: "Actions" }).getAttribute("href")).toBe(`/repo/${repositoryId}/actions`);
    expect(screen.getByRole("link", { name: "Releases" }).getAttribute("href")).toBe(`/repo/${repositoryId}/releases`);
    expect(screen.queryByRole("heading", { name: "Repository files" })).toBeNull();
    expect(screen.getByText("This branch does not contain any files yet.")).toBeTruthy(); expect(screen.queryByText("Select a file to preview")).toBeNull();
    expect(document.querySelector(".commit-section")).toBeNull(); expect(document.querySelector(".commit-history")).toBeNull();
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create file" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Quick setup" })).toBeNull());
    expect((await screen.findAllByText("README.md")).length).toBeGreaterThan(0); expect(await screen.findByText("Initial commit")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("location-search").textContent).toContain("path=README.md"));
    expect(screen.getByTestId("location-search").textContent).toContain("branch=main");
    expect(snapshotRequests).toBe(2); expect(historyRequests).toBe(2); expect(branchRequests).toBe(1);
  });

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

  test("a late snapshot from the previous branch cannot overwrite the selected branch", async () => {
    const mainSnapshot = deferred();
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", owner: { _id: ownerId, username: "developer" }, visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "feature", isDefault: false }] }));
      if (value.includes("/branches/main/snapshot")) return mainSnapshot.promise;
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [] }));
      if (value.includes("/branches/feature/snapshot")) return Promise.resolve(jsonResponse({ files: [{ filename: "feature.js", path: "feature.js" }] }));
      if (value.includes("/branches/feature/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "f1", message: "Feature stays selected", author: { name: "Dev" } }] }));
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "feature", previewSupported: true }));
      return Promise.resolve(jsonResponse({}));
    });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("option", { name: /feature/i }));
    expect((await screen.findAllByText("feature.js")).length).toBeGreaterThan(0);
    mainSnapshot.resolve(jsonResponse({ files: [{ filename: "README.md", path: "README.md" }] }));
    await Promise.resolve();
    expect(screen.queryByText("README.md")).toBeNull();
    expect(screen.getByText("Feature stays selected")).toBeTruthy();
  });

  test("a late repository response cannot replace the newly navigated repository", async () => {
    const oldRepository = deferred();
    const nextId = "507f1f77bcf86cd799439099";
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return oldRepository.promise;
      if (value.endsWith(`/repo/${nextId}`)) return Promise.resolve(jsonResponse({ _id: nextId, name: "new-project", owner: { _id: ownerId, username: "developer" }, visibility: "private" }));
      if (value.endsWith("/branches")) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }] }));
      if (value.includes("/snapshot")) return Promise.resolve(jsonResponse({ files: [] }));
      if (value.includes("/history")) return Promise.resolve(jsonResponse({ commits: [] }));
      return Promise.resolve(jsonResponse({ counts: { open: 0 }, pagination: { total: 0 } }));
    });

    render(<MemoryRouter initialEntries={[`/repo/${repositoryId}`]}><NavigateToRepository id={nextId} /><Routes><Route path="/repo/:id" element={<RepoPage />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open next repository" }));
    expect(await screen.findByRole("heading", { name: /new-project/i })).toBeTruthy();
    oldRepository.resolve(jsonResponse({ _id: repositoryId, name: "old-project", owner: { username: "old-owner" }, visibility: "public" }));
    await Promise.resolve();
    expect(screen.queryByText("old-project")).toBeNull();
    expect(screen.getByText("Private")).toBeTruthy();
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
    expect(await screen.findByText("This branch does not contain any files yet.")).toBeTruthy();
    expect(screen.queryByText("No commits on this branch yet")).toBeNull();
    expect(screen.getByRole("button", { name: /empty/i })).toBeTruthy();
  });

  test("ownerId fallback creates, selects, and loads a slash-named branch without navigation", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      calls.push({ url: value, method: options.method || "GET", headers: options.headers });
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
    await waitFor(() => expect(screen.getByTestId("location-search").textContent).toContain("branch=feature%2Ftest"));
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compare" }).disabled).toBe(false);
    const createCall = calls.find((call) => call.method === "POST" && call.url.endsWith(`/repo/${repositoryId}/branches`));
    expect(createCall).toBeTruthy();
    expect(createCall.headers.get("Authorization")).toBe("Bearer test-token");
    expect(createCall.headers.get("Content-Type")).toBe("application/json");
    expect(calls.filter((call) => call.url.includes("/branches/feature%2Ftest/snapshot"))).toHaveLength(1);
    expect(calls.filter((call) => call.url.includes("/branches/feature%2Ftest/history"))).toHaveLength(1);
  });

  test("authenticated non-owner sees create action and receives the friendly 403 message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", ownerId: "507f1f77bcf86cd799439099", visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`) && options.method === "POST") return Promise.resolve(jsonResponse({ error: "Forbidden" }, 403));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true, commitCount: 0 }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: [] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [] }));
      return Promise.resolve(jsonResponse({}, 200));
    });

    renderPage();
    await screen.findByText("This branch does not contain any files yet.");
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(screen.queryByText("Upload Project Folder")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Files" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Commit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Push" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pull" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("button", { name: /new branch/i }));
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "feature/denied" } });
    fireEvent.click(screen.getByRole("button", { name: /^create branch$/i }));
    expect(await screen.findByText("You do not have permission to create branches in this repository.")).toBeTruthy();
  });

  test("does not submit branch creation without a JWT", async () => {
    localStorage.removeItem("token");
    let createRequests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", ownerId, visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`) && options.method === "POST") {
        createRequests += 1;
        return Promise.resolve(jsonResponse({}, 201));
      }
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: [] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [] }));
      return Promise.resolve(jsonResponse({}, 200));
    });

    renderPage();
    await screen.findByText("This branch does not contain any files yet.");
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("button", { name: /new branch/i }));
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "feature/no-token" } });
    fireEvent.click(screen.getByRole("button", { name: /^create branch$/i }));
    expect(await screen.findByText("Your session has expired. Please sign in again.")).toBeTruthy();
    expect(createRequests).toBe(0);
  });
});

test("Add file dropdown invokes handlers and closes with Escape or outside click", () => {
  const handlers = { onCreate: vi.fn(), onUploadFiles: vi.fn(), onUploadFolder: vi.fn() };
  render(<div><AddFileMenu {...handlers} /><button type="button">Outside</button></div>);
  const toggle = screen.getByRole("button", { name: /Add file/ }); fireEvent.click(toggle);
  fireEvent.keyDown(document, { key: "Escape" }); expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle); fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" })); expect(toggle.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(toggle); fireEvent.click(screen.getByRole("menuitem", { name: "Upload files" })); expect(handlers.onUploadFiles).toHaveBeenCalledOnce();
  fireEvent.click(toggle); fireEvent.click(screen.getByRole("menuitem", { name: "Upload project folder" })); expect(handlers.onUploadFolder).toHaveBeenCalledOnce();
  fireEvent.click(toggle); fireEvent.click(screen.getByRole("menuitem", { name: "Create new file" })); expect(handlers.onCreate).toHaveBeenCalledOnce();
});

test("public, private, described, and undescribed repositories share one header structure", () => {
  expect(repositoryDescription("x")).toBe("No description provided.");
  expect(repositoryDescription(null)).toBe("No description provided.");
  expect(repositoryDescription("A useful project")).toBe("A useful project");
  const publicRepository = { name: "project", owner: { username: "developer" }, visibility: "public", description: "x" };
  const { container, rerender } = render(<RepoHeader repository={publicRepository}><button type="button">Action</button></RepoHeader>);
  const publicStructure = container.querySelector(".repo-header").className;
  expect(container.querySelectorAll(".repo-header")).toHaveLength(1);
  expect(screen.getByText("No description provided.")).toBeTruthy();
  rerender(<RepoHeader repository={{ ...publicRepository, visibility: "private", description: "A useful project" }}><button type="button">Action</button></RepoHeader>);
  expect(container.querySelectorAll(".repo-header")).toHaveLength(1);
  expect(container.querySelector(".repo-header").className).toBe(publicStructure);
  expect(screen.getByText("Private")).toBeTruthy();
  expect(screen.getByText("A useful project")).toBeTruthy();
  expect(container.querySelector(".repo-header__actions")).toBeTruthy();
});

test("repository content states are exclusive and loading never exposes Quick Setup", () => {
  const { rerender } = render(<RepoContent loading empty emptyContent={<h2>Quick setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByText("Quick setup")).toBeNull();
  expect(screen.queryByText("Browser content")).toBeNull();
  rerender(<RepoContent loading={false} empty emptyContent={<h2>Quick setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.getByText("Quick setup")).toBeTruthy();
  expect(screen.queryByText("Browser content")).toBeNull();
  rerender(<RepoContent loading={false} empty={false} emptyContent={<h2>Quick setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.queryByText("Quick setup")).toBeNull();
  expect(screen.getByText("Browser content")).toBeTruthy();
});
