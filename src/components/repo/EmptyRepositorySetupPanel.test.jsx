// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import EmptyRepositorySetupPanel from "./EmptyRepositorySetupPanel";

const repository = { _id: "repo-1", name: "empty-project", visibility: "private", owner: { username: "Puskar" } };
const renderPanel = (props = {}) => render(<MemoryRouter><EmptyRepositorySetupPanel repository={repository} defaultBranch="main" selectedBranch="main" role="owner" protection={{ protected: false }} canCreateContent canDirectWrite canInviteCollaborators onUpload={vi.fn()} onAddFiles={vi.fn()} addFilesDisabled={false} onCreateStarter={vi.fn().mockResolvedValue({})} {...props} /></MemoryRouter>);

beforeEach(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } }); vi.spyOn(window, "confirm").mockReturnValue(true); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test("quick setup renders real metadata, published CLI commands, clone forms, and documentation", () => {
  renderPanel();
  expect(screen.getByRole("heading", { name: "Quick setup" })).toBeTruthy(); expect(screen.getByText("Puskar/empty-project")).toBeTruthy();
  expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy(); expect(screen.getByText("codehub login")).toBeTruthy();
  expect(screen.getByText("codehub clone Puskar/empty-project")).toBeTruthy(); expect(screen.getByText("codehub clone https://codehub.sbs/Puskar/empty-project")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View full CLI documentation/ }).getAttribute("href")).toBe("/docs/cli");
  fireEvent.click(screen.getByRole("button", { name: /More setup options/ }));
  expect(screen.getByRole("link", { name: "Invite collaborators" }).getAttribute("href")).toBe("/repo/repo-1/settings/collaborators");
});

test("copy feedback succeeds and reports clipboard failure", async () => {
  renderPanel(); fireEvent.click(screen.getByRole("button", { name: "Copy owner and repository clone command" }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("codehub clone Puskar/empty-project")); expect((await screen.findAllByText("Copied")).length).toBeGreaterThan(0);
  navigator.clipboard.writeText.mockRejectedValueOnce(new Error("denied")); fireEvent.click(screen.getByRole("button", { name: "Copy CodeHub login command" }));
  expect(await screen.findByText("Unable to copy. Select the command manually.")).toBeTruthy();
});

test("more options expose platform commands and editable starter actions", async () => {
  const onCreateStarter = vi.fn().mockResolvedValue({}); renderPanel({ onCreateStarter });
  const toggle = screen.getByRole("button", { name: /More setup options/ }); expect(toggle.getAttribute("aria-expanded")).toBe("false"); fireEvent.click(toggle); expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText(/Out-File README.md/)).toBeTruthy(); fireEvent.click(screen.getByRole("tab", { name: "macOS/Linux" })); expect(screen.getByText(/echo "# empty-project" > README.md/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add .gitignore" })); await waitFor(() => expect(onCreateStarter).toHaveBeenCalledWith("gitignore", expect.stringContaining("node_modules/")));
  fireEvent.click(screen.getByRole("button", { name: "Add LICENSE" })); await waitFor(() => expect(onCreateStarter).toHaveBeenCalledWith("license", expect.stringContaining("MIT License")));
});

test("write actions follow role and branch protection while owner-only collaboration stays hidden", () => {
  const view = renderPanel({ role: "read", canCreateContent: false, canDirectWrite: false, canInviteCollaborators: false });
  expect(screen.queryByRole("button", { name: "Create README" })).toBeNull(); expect(screen.queryByRole("link", { name: "Invite collaborators" })).toBeNull();
  view.rerender(<MemoryRouter><EmptyRepositorySetupPanel repository={repository} defaultBranch="main" selectedBranch="main" role="write" protection={{ protected: true }} canCreateContent canDirectWrite={false} canInviteCollaborators={false} onCreateStarter={vi.fn()} /></MemoryRouter>);
  expect(screen.getByText("Direct changes are blocked on protected branch main.")).toBeTruthy(); expect(screen.getByRole("button", { name: "Create README" }).disabled).toBe(true);
  expect(screen.getByText(/codehub branch feature\/initial-setup/)).toBeTruthy();
});
