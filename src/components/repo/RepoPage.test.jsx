// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import RepoPage from "./RepoPage";
import AddFileMenu from "./AddFileMenu";
import { RepoContent, RepoHeader, RepoTabs } from "./RepositoryPageShell";
import { repositoryDescription } from "./repositoryPageUtils";
import RepositorySidebar from "../repository/RepositorySidebar";

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
  test("empty branch shows only command-line setup and header file creation restores the normal browser", async () => {
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
    expect(await screen.findByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(`/repo/${repositoryId}/settings/collaborators`);
    expect(screen.getByRole("link", { name: "Actions" }).getAttribute("href")).toBe(`/repo/${repositoryId}/actions`);
    expect(screen.getByRole("link", { name: "Releases" }).getAttribute("href")).toBe(`/repo/${repositoryId}/releases`);
    expect(screen.queryByRole("heading", { name: "Repository files" })).toBeNull();
    expect(document.querySelectorAll(".empty-repository-command-section")).toHaveLength(2); expect(screen.queryByText("Select a file to preview")).toBeNull();
    expect(screen.queryByRole("button", { name: "Upload files" })).toBeNull(); expect(screen.queryByRole("button", { name: "Upload folder" })).toBeNull(); expect(screen.queryByRole("button", { name: "Create file" })).toBeNull();
    expect(document.querySelector(".commit-section")).toBeNull(); expect(document.querySelector(".commit-history")).toBeNull();
    expect(document.querySelector(".repo-browser")).toBeNull(); expect(document.querySelector(".repo-sidebar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Compare" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Add file/ })); fireEvent.click(screen.getByRole("menuitem", { name: "Create new file" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "…or create a new repository from the command line" })).toBeNull());
    expect((await screen.findAllByText("README.md")).length).toBeGreaterThan(0); expect((await screen.findAllByText("Initial commit")).length).toBeGreaterThan(0);
    expect(document.querySelector(".repo-browser > .repo-tree")).toBeTruthy(); expect(document.querySelector(".repo-browser > .repo-browser__preview")).toBeTruthy(); expect(document.querySelector(".repo-browser > .repo-sidebar")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("location-search").textContent).toContain("path=README.md"));
    expect(screen.getByTestId("location-search").textContent).toContain("branch=main");
    expect(snapshotRequests).toBe(2); expect(historyRequests).toBe(2); expect(branchRequests).toBe(1);
  });

  test.each([
    ["browser file upload", "Upload files", "Choose files to upload", "app.js"],
    ["project-folder upload", "Upload project folder", "Choose project folder to upload", "src/app.js"],
  ])("%s removes the command setup after the selected-branch snapshot gains content", async (_label, menuItem, inputLabel, uploadedPath) => {
    let uploaded = false; let addRequest;
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "upload-project", owner: { _id: ownerId, username: "Puskar" }, visibility: "private", permissions: { canUploadFiles: true, canEditFiles: true } }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: uploaded ? [{ filename: uploadedPath.split("/").at(-1), path: uploadedPath }] : [] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [] }));
      if (value.endsWith(`/repo/add/${repositoryId}`) && options.method === "POST") { uploaded = true; addRequest = options.body; return Promise.resolve(jsonResponse({ message: "Files added" })); }
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "uploaded", previewSupported: true }));
      return Promise.resolve(jsonResponse({ counts: { open: 0 }, pagination: { total: 0 } }));
    });

    renderPage(); await screen.findByRole("heading", { name: "…or create a new repository from the command line" });
    fireEvent.click(screen.getByRole("button", { name: /Add file/ })); fireEvent.click(screen.getByRole("menuitem", { name: menuItem }));
    const file = new File(["uploaded"], uploadedPath.split("/").at(-1), { type: "text/javascript" });
    if (uploadedPath.includes("/")) Object.defineProperty(file, "webkitRelativePath", { value: uploadedPath });
    fireEvent.change(screen.getByLabelText(inputLabel), { target: { files: [file] } });
    expect(screen.getByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy();
    expect(screen.queryByText(/Loading repository content/)).toBeNull();
    await waitFor(() => expect(screen.queryByRole("heading", { name: "…or create a new repository from the command line" })).toBeNull());
    expect(document.querySelector(".repo-browser")).toBeTruthy(); expect(addRequest).toBeInstanceOf(FormData); expect(addRequest.get("paths")).toBe(uploadedPath);
  });

  test("commit clears working-tree controls while persisted ahead state keeps Push available through refresh and failure", async () => {
    let staged = false; let ahead = 0; let pushed = false; let failNextPush = true;
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({
        _id: repositoryId, name: "project", owner: { _id: ownerId, username: "Puskar" }, visibility: "private",
        permissions: { canUploadFiles: true, canEditFiles: true },
      }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", head: pushed ? "local-1" : "remote-1", isDefault: true }] }));
      if (value.includes("/branches/main/status")) return Promise.resolve(jsonResponse({
        branch: "main", localHead: ahead ? "local-1" : "remote-1", remoteHead: pushed ? "local-1" : "remote-1",
        aheadCount: ahead, behindCount: 0, hasStagedChanges: staged, hasUnpushedCommits: ahead > 0,
      }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: [{ filename: "README.md", path: "README.md" }, ...(staged ? [{ filename: "new.txt", path: "new.txt" }] : [])] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "remote-1", message: "Initial", author: { name: "Puskar" } }] }));
      if (value.endsWith(`/repo/add/${repositoryId}`) && options.method === "POST") { staged = true; return Promise.resolve(jsonResponse({ message: "Files added", hasStagedChanges: true })); }
      if (value.endsWith(`/repo/commit/${repositoryId}`) && options.method === "POST") {
        staged = false; ahead = 1;
        return Promise.resolve(jsonResponse({ message: "Commit created locally. Push to publish it.", status: { localHead: "local-1", remoteHead: "remote-1", aheadCount: 1, hasUnpushedCommits: true } }));
      }
      if (value.endsWith(`/repo/push/${repositoryId}`) && options.method === "POST") {
        if (failNextPush) { failNextPush = false; return Promise.resolve(jsonResponse({ error: "Temporary storage failure" }, 503)); }
        ahead = 0; pushed = true;
        return Promise.resolve(jsonResponse({ message: "Push successful!", localHead: "local-1", remoteHead: "local-1", aheadCount: 0 }));
      }
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "readme", previewSupported: true }));
      return Promise.resolve(jsonResponse({ counts: { open: 0 }, pagination: { total: 0 } }));
    });

    const first = renderPage();
    await screen.findAllByText("Initial");
    fireEvent.click(screen.getByRole("button", { name: /Add file/ })); fireEvent.click(screen.getByRole("menuitem", { name: "Upload files" }));
    fireEvent.change(screen.getByLabelText("Choose files to upload"), { target: { files: [new File(["new"], "new.txt", { type: "text/plain" })] } });
    const commit = await screen.findByRole("button", { name: "Commit" });
    expect(commit.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Commit message for main"), { target: { value: "Add new file" } });
    expect(commit.disabled).toBe(false); fireEvent.click(commit);
    const push = await screen.findByRole("button", { name: "Push (1)" });
    expect(push.disabled).toBe(false); expect(screen.queryByPlaceholderText("Commit message for main")).toBeNull();
    first.unmount(); renderPage();
    const refreshedPush = await screen.findByRole("button", { name: "Push (1)" });
    fireEvent.click(refreshedPush);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Temporary storage failure"));
    expect(screen.getByRole("button", { name: "Push (1)" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Push (1)" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /Push/ })).toBeNull());
  });

  test("an empty repository does not poll or leave setup after sixty seconds", async () => {
    let repositoryRequests = 0; let snapshotRequests = 0; let historyRequests = 0;
    const intervalSpy = vi.spyOn(window, "setInterval");
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) { repositoryRequests += 1; return Promise.resolve(jsonResponse({ _id: repositoryId, name: "stable-empty", owner: { _id: ownerId, username: "Puskar" }, visibility: "public" })); }
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }] }));
      if (value.includes("/branches/main/snapshot")) { snapshotRequests += 1; return Promise.resolve(jsonResponse({ files: [] })); }
      if (value.includes("/branches/main/history")) { historyRequests += 1; return Promise.resolve(jsonResponse({ commits: [] })); }
      return Promise.resolve(jsonResponse({}));
    });
    renderPage(); await screen.findByRole("heading", { name: "…or create a new repository from the command line" });
    expect([repositoryRequests, snapshotRequests, historyRequests]).toEqual([1, 1, 1]); intervalSpy.mockClear();
    fireEvent.focus(window); vi.useFakeTimers(); vi.advanceTimersByTime(60000); vi.useRealTimers(); await Promise.resolve();
    expect(intervalSpy).not.toHaveBeenCalled(); expect([repositoryRequests, snapshotRequests, historyRequests]).toEqual([1, 1, 1]);
    expect(screen.getByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy(); expect(screen.queryByRole("status", { name: /Loading/ })).toBeNull();
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
    expect((await screen.findAllByText("Main commit")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("option", { name: /feature\/login/i }));
    expect((await screen.findAllByText("login.js")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Feature commit")).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("Feature stays selected").length).toBeGreaterThan(0);
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
      if (value.includes("/branches/empty/history")) return Promise.resolve(jsonResponse({ branch: "empty", commits: [{ hash: "empty-commit", message: "Empty initial commit" }] }));
      return Promise.resolve(jsonResponse({ content: "" }));
    });
    renderPage(`/repo/${repositoryId}?branch=empty`);
    expect(await screen.findByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy();
    expect(screen.queryByText("No commits on this branch yet")).toBeNull();
    expect(screen.getByRole("button", { name: /empty/i })).toBeTruthy();
  });

  test("switching from repository content to a truly empty branch restores only the command setup", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url);
      if (value.endsWith(`/repo/${repositoryId}`)) return Promise.resolve(jsonResponse({ _id: repositoryId, name: "project", owner: { _id: ownerId, username: "developer" }, visibility: "public" }));
      if (value.endsWith(`/repo/${repositoryId}/branches`)) return Promise.resolve(jsonResponse({ defaultBranch: "main", branches: [{ name: "main", isDefault: true }, { name: "empty", isDefault: false }] }));
      if (value.includes("/branches/main/snapshot")) return Promise.resolve(jsonResponse({ files: [{ filename: "README.md", path: "README.md" }] }));
      if (value.includes("/branches/main/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "m1", message: "Content commit" }] }));
      if (value.includes("/branches/empty/snapshot")) return Promise.resolve(jsonResponse({ files: [] }));
      if (value.includes("/branches/empty/history")) return Promise.resolve(jsonResponse({ commits: [{ hash: "e1", message: "Empty commit" }] }));
      if (value.includes("/repo/preview/")) return Promise.resolve(jsonResponse({ content: "# Project", previewSupported: true }));
      return Promise.resolve(jsonResponse({}));
    });
    renderPage(); expect((await screen.findAllByText("README.md")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /main/i })); fireEvent.click(screen.getByRole("option", { name: /empty/i }));
    expect(await screen.findByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy();
    expect(document.querySelectorAll(".empty-repository-command-section")).toHaveLength(2); expect(document.querySelector(".repo-browser")).toBeNull(); expect(document.querySelector(".commit-history")).toBeNull();
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
    await screen.findByRole("heading", { name: "…or create a new repository from the command line" });
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
    await screen.findByRole("heading", { name: "…or create a new repository from the command line" });
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

test("repository header keeps information, mentor request, and navigation in separate rows", () => {
  const repository = { name: "test-35", owner: { username: "Puskar" }, visibility: "public", description: "A normal repository description." };
  const { container } = render(<MemoryRouter><RepoHeader
    repository={repository}
    actions={<button type="button">Code</button>}
    mentor={<button type="button">Ask a Mentor</button>}
    navigation={<RepoTabs repositoryId="repo-1" pathname="/repo/repo-1" counts={{ issues: 0, pulls: 0 }} />}
  /></MemoryRouter>);

  const header = container.querySelector(".repo-page-header");
  expect(header.children[0].classList.contains("repo-header-main")).toBe(true);
  expect(header.children[1].classList.contains("mentor-request-section")).toBe(true);
  expect(header.children[2].classList.contains("repo-navigation")).toBe(true);
  expect(header.children[2].tagName).toBe("NAV");
  expect(header.querySelector(".repo-header-info")).toBeTruthy();
  expect(header.querySelector(".repo-owner-name").textContent).toBe("Puskar");
  expect(header.querySelector(".repo-title-separator").textContent).toBe("/");
  expect(header.querySelector(".repo-title-row").textContent).toContain("Puskar/test-35");
  expect(header.querySelector(".repo-description").textContent).toBe("A normal repository description.");
  expect(header.querySelector(".repo-header-actions").contains(screen.getByRole("button", { name: "Code" }))).toBe(true);
});

test("repository content states are exclusive and loading never exposes command setup", () => {
  const { rerender } = render(<RepoContent loading empty emptyContent={<h2>Command setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByText("Command setup")).toBeNull();
  expect(screen.queryByText("Browser content")).toBeNull();
  rerender(<RepoContent loading={false} empty emptyContent={<h2>Command setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.getByText("Command setup")).toBeTruthy();
  expect(screen.queryByText("Browser content")).toBeNull();
  rerender(<RepoContent loading={false} empty={false} emptyContent={<h2>Command setup</h2>}><p>Browser content</p></RepoContent>);
  expect(screen.queryByText("Command setup")).toBeNull();
  expect(screen.getByText("Browser content")).toBeTruthy();
});

test("repository sidebar renders existing social, release, and language data", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).includes("/releases")
    ? jsonResponse({ releases: [{ _id: "release-1", title: "Version 1.0", tag: { name: "v1.0.0" } }], pagination: { total: 3 }, canManage: true })
    : jsonResponse({ languages: [{ name: "JavaScript", bytes: 75, percentage: 75 }, { name: "CSS", bytes: 25, percentage: 25 }] })));
  const repository = { _id: repositoryId, description: "Modern repository", social: { starCount: 8, watcherCount: 4, forkCount: 2 } };
  render(<MemoryRouter><RepositorySidebar repository={repository} branch="main" files={[{ path: "README.md" }]} /></MemoryRouter>);
  expect(screen.getByText("Modern repository")).toBeTruthy();
  expect(screen.getByRole("link", { name: "README" })).toBeTruthy();
  expect(await screen.findByRole("link", { name: /Version 1.0/ })).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getByRole("progressbar", { name: "JavaScript 75 percent" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Create a new release" })).toBeTruthy();
});

test("repository sidebar safely hides unavailable language and release details", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ error: "Unavailable" }, 500));
  render(<MemoryRouter><RepositorySidebar repository={{ _id: repositoryId, description: "x" }} branch="main" files={[]} /></MemoryRouter>);
  expect(screen.getByText("No description provided.")).toBeTruthy();
  await waitFor(() => expect(screen.getByText("No published releases.")).toBeTruthy());
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("link", { name: "README" })).toBeNull();
});
