// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FileViewer from "../repository/FileViewer";
import FileEditorPage from "./FileEditorPage";

vi.mock("../../authContext", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
const response = (body, ok = true, status = ok ? 200 : 500) => ({ ok, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const repo = { _id: "repo", name: "demo", owner: { username: "puskar" } };
const editor = { content: "const oldValue = 1;\n", baseCommit: "abc", file: { path: "src/app.js", branch: "main" } };
const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
const renderEditor = () => render(<MemoryRouter initialEntries={["/repo/repo/edit?branch=main&path=src%2Fapp.js"]}><Routes><Route path="/repo/:id/edit" element={<FileEditorPage />} /><Route path="/repo/:id" element={<Location />} /></Routes></MemoryRouter>);

beforeEach(() => { localStorage.setItem("token", "token"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("FileEditorPage", () => {
  test("loads a file, requires changes, saves branch/path/content, and returns to the file", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input, options = {}) => {
      calls.push([String(input), options]);
      if (String(input).includes("file-editor") && options.method === "PUT") return Promise.resolve(response({ message: "File updated successfully", commit: { hash: "new" } }));
      return Promise.resolve(response(String(input).includes("file-editor") ? editor : repo));
    });
    renderEditor();
    const textarea = await screen.findByLabelText("File contents");
    expect(textarea.value).toContain("oldValue");
    fireEvent.change(textarea, { target: { value: "const newValue = 2;\n" } });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("/repo/repo?branch=main&path=src%2Fapp.js"));
    const request = calls.find(([, options]) => options.method === "PUT");
    expect(JSON.parse(request[1].body)).toMatchObject({ path: "src/app.js", branch: "main", content: "const newValue = 2;\n", baseCommit: "abc" });
  });

  test("shows stale edit errors and an accessible cancel warning", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input, options = {}) => Promise.resolve(
      String(input).includes("file-editor") && options.method === "PUT"
        ? response({ error: "The file changed after you opened it. Reload before saving." }, false, 409)
        : response(String(input).includes("file-editor") ? editor : repo),
    ));
    renderEditor(); const textarea = await screen.findByLabelText("File contents");
    fireEvent.change(textarea, { target: { value: "changed" } });
    const exitEvent = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(exitEvent); expect(exitEvent.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Discard unsaved changes?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/changed after you opened/)).toBeTruthy();
  });

  test("Edit is visible for editable text and hidden for binary files", () => {
    const common = { apiBase: "", repositoryId: "repo", repositoryName: "demo", branch: "main", getAuthHeaders: () => ({}), onDownload: vi.fn(), onEdit: vi.fn(), preview: { status: "ready", data: { content: "hello", previewSupported: true } } };
    const { rerender } = render(<FileViewer {...common} selectedNode={{ path: "src/app.js", name: "app.js", file: { path: "src/app.js", size: 10 } }} />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    rerender(<FileViewer {...common} selectedNode={{ path: "image.png", name: "image.png", file: { path: "image.png", size: 10 } }} preview={{ status: "ready", data: { content: null, previewSupported: false, binary: true } }} />);
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  test("file More menu keeps copy path, rename, and dangerous delete behind one control", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const onRename = vi.fn(); const onDelete = vi.fn(); const onDownload = vi.fn();
    render(<FileViewer apiBase="" repositoryId="repo" repositoryName="demo" branch="main" getAuthHeaders={() => ({})} onDownload={onDownload} onEdit={vi.fn()} onRename={onRename} onDelete={onDelete} preview={{ status: "ready", data: { content: "hello", previewSupported: true } }} selectedNode={{ path: "src/app.js", name: "app.js", file: { path: "src/app.js", size: 10 } }} />);
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy path" })); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("src/app.js"));
    fireEvent.click(screen.getByRole("button", { name: "More" })); fireEvent.click(screen.getByRole("menuitem", { name: "Rename" })); expect(onRename).toHaveBeenCalledWith("src/app.js");
    fireEvent.click(screen.getByRole("button", { name: "More" })); fireEvent.click(screen.getByRole("menuitem", { name: "Delete" })); expect(onDelete).toHaveBeenCalledWith("src/app.js");
    fireEvent.click(screen.getByRole("button", { name: "Download" })); expect(onDownload).toHaveBeenCalledWith("src/app.js");
  });
});
