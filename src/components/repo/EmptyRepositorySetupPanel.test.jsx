// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import EmptyRepositorySetupPanel from "./EmptyRepositorySetupPanel";

const repository = { _id: "repo-1", name: "empty-project", visibility: "private", owner: { username: "Puskar" } };
const newRepositoryCommands = [
  "codehub init https://codehub.sbs/Puskar/empty-project",
  "codehub add README.md",
  'codehub commit -m "first commit"',
  "codehub push",
].join("\n");
const existingRepositoryCommands = [
  "codehub init https://codehub.sbs/Puskar/empty-project",
  "codehub add .",
  'codehub commit -m "Initial commit"',
  "codehub push",
].join("\n");

beforeEach(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test("empty repository renders exactly the two supported command sections", () => {
  const { container } = render(<EmptyRepositorySetupPanel repository={repository} />);
  expect(container.querySelectorAll(".empty-repository-command-section")).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "…or create a new repository from the command line" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "…or push an existing repository from the command line" })).toBeTruthy();
  expect([...container.querySelectorAll("code")].map((node) => node.textContent)).toEqual([newRepositoryCommands, existingRepositoryCommands]);
});

test("empty setup omits browser actions, recommendations, protocol controls, and unsupported CLI syntax", () => {
  render(<EmptyRepositorySetupPanel repository={repository} />);
  ["Upload files", "Upload folder", "Create file", "Quick setup", "More setup options", "HTTPS", "SSH", "README recommendations", "LICENSE recommendations", "codehub login"].forEach((label) => expect(screen.queryByText(label)).toBeNull());
  expect(screen.queryByText(/codehub remote add origin/)).toBeNull();
  expect(screen.queryByText(/codehub push -u origin main/)).toBeNull();
  expect(screen.queryByText(/^codehub branch main$/m)).toBeNull();
  expect(screen.getAllByRole("button", { name: /Copy/ })).toHaveLength(2);
});

test("each Copy button copies its complete command block", async () => {
  render(<EmptyRepositorySetupPanel repository={repository} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy new repository commands" }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(newRepositoryCommands));
  fireEvent.click(screen.getByRole("button", { name: "Copy existing repository commands" }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(existingRepositoryCommands));
});

test("authorized read-only viewers receive the same repository-specific command instructions", () => {
  const { container } = render(<EmptyRepositorySetupPanel repository={repository} canCreateContent={false} canDirectWrite={false} />);
  expect([...container.querySelectorAll("code")].map((node) => node.textContent)).toEqual([newRepositoryCommands, existingRepositoryCommands]);
});
