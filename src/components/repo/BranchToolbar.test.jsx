// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import BranchToolbar from "./BranchToolbar";

const branches = [
  { name: "main", isDefault: true, commitCount: 3 },
  { name: "feature/login", isDefault: false, commitCount: 1 },
];

const props = (overrides = {}) => ({
  branches,
  selectedBranch: "main",
  defaultBranch: "main",
  commitCount: 3,
  loading: false,
  error: "",
  canManageBranches: true,
  message: "",
  onSelect: vi.fn(),
  onCreate: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("BranchToolbar", () => {
  test("shows the active branch, counts, default badge, and protected delete actions", () => {
    render(<BranchToolbar {...props()} />);
    expect(screen.getByRole("button", { name: /main/i })).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    expect(screen.getByText("Default")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /delete branch main/i })).toBeNull();
    expect(screen.getByRole("button", { name: /delete branch feature\/login/i })).toBeTruthy();
  });

  test("switches branches without reloading", () => {
    const onSelect = vi.fn();
    render(<BranchToolbar {...props({ onSelect })} />);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("option", { name: /feature\/login/i }));
    expect(onSelect).toHaveBeenCalledWith("feature/login");
  });

  test("validates and creates a branch from the selected source", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<BranchToolbar {...props({ onCreate })} />);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("button", { name: /new branch/i }));
    fireEvent.click(screen.getByRole("button", { name: /^create branch$/i }));
    expect(screen.getByText("Branch name is required.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Branch name"), { target: { value: "feature/profile" } });
    fireEvent.click(screen.getByRole("button", { name: /^create branch$/i }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: "feature/profile", sourceBranch: "main" }));
  });

  test("shows the create action only to branch managers", () => {
    const { rerender } = render(<BranchToolbar {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    expect(screen.getByRole("button", { name: /new branch/i }).className).toBe("branch-create-action");
    rerender(<BranchToolbar {...props({ canManageBranches: false })} />);
    expect(screen.queryByRole("button", { name: /new branch/i })).toBeNull();
  });

  test("requires confirmation before deleting a non-selected branch", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<BranchToolbar {...props({ onDelete })} />);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete branch feature\/login/i }));
    expect(screen.getByText(/delete branch “feature\/login”/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^delete branch$/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(branches[1]));
  });

  test("renders loading, empty, and error dropdown states", () => {
    const { rerender } = render(<BranchToolbar {...props({ branches: [], selectedBranch: "", loading: true })} />);
    fireEvent.click(screen.getByRole("button", { name: /loading branches/i }));
    expect(screen.getByRole("status").textContent).toContain("Loading branches...");
    cleanup();
    render(<BranchToolbar {...props({ branches: [], selectedBranch: "main", error: "Branches unavailable" })} />);
    fireEvent.click(screen.getByRole("button", { name: /main/i }));
    expect(screen.getByText("Branches unavailable")).toBeTruthy();
    expect(rerender).toBeTruthy();
  });

  test("disables compare when the repository has only one branch", () => {
    render(<BranchToolbar {...props({ branches: [branches[0]] })} />);
    const compareButton = screen.getByRole("button", { name: "Compare" });
    expect(compareButton.disabled).toBe(true);
    expect(compareButton.title).toBe("Create another branch to compare changes");
  });
});
