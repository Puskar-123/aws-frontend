// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import EmptyRepositorySetupPanel from "./EmptyRepositorySetupPanel";

const repository = { _id: "repo-1", name: "empty-project", visibility: "private", owner: { username: "Puskar" } };
const actions = { onUploadFiles: vi.fn(), onUploadFolder: vi.fn(), onCreateFile: vi.fn() };
const renderPanel = (props = {}) => render(<MemoryRouter><EmptyRepositorySetupPanel repository={repository} selectedBranch="main" canCreateContent canDirectWrite {...actions} {...props} /></MemoryRouter>);

beforeEach(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); Object.values(actions).forEach((mock) => mock.mockClear()); });

test("quick setup renders concise real-repository CLI commands", () => {
  renderPanel();
  expect(screen.getByRole("heading", { name: "Quick setup" })).toBeTruthy();
  expect(screen.getByText("This branch does not contain any files yet.")).toBeTruthy();
  expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy();
  expect(screen.getByText("codehub login")).toBeTruthy();
  expect(screen.getByText("codehub clone Puskar/empty-project")).toBeTruthy();
});

test("copy feedback is announced and copies the exact clone command", async () => {
  renderPanel(); fireEvent.click(screen.getByRole("button", { name: "Copy repository clone command" }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("codehub clone Puskar/empty-project"));
  expect((await screen.findAllByText("Copied")).length).toBeGreaterThan(0);
});

test("browser setup actions reuse the supplied upload and create handlers", () => {
  renderPanel();
  fireEvent.click(screen.getByRole("button", { name: "Upload files" })); fireEvent.click(screen.getByRole("button", { name: "Upload folder" })); fireEvent.click(screen.getByRole("button", { name: "Create file" }));
  expect(actions.onUploadFiles).toHaveBeenCalledOnce(); expect(actions.onUploadFolder).toHaveBeenCalledOnce(); expect(actions.onCreateFile).toHaveBeenCalledOnce();
  const toggle = screen.getByRole("button", { name: /More setup options/ }); fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true"); expect(screen.getByRole("link", { name: "View full CLI documentation" })).toBeTruthy();
});

test("read-only users see clone instructions but no write actions", () => {
  renderPanel({ canCreateContent: false, canDirectWrite: false });
  expect(screen.queryByRole("button", { name: "Upload files" })).toBeNull(); expect(screen.queryByRole("button", { name: "Create file" })).toBeNull();
  expect(screen.getByText("codehub clone Puskar/empty-project")).toBeTruthy();
});
