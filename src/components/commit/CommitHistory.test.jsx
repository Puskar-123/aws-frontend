// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import CommitHistory from "./CommitHistory";

const commit = {
  hash: "abc123456789",
  message: "Update navigation",
  author: { name: "Puskar", email: "" },
  time: "2026-07-13T18:30:00.000Z",
  branch: "main",
  files: [{ path: "src/App.jsx", status: "modified" }],
  summary: { filesChanged: 2, additions: 4, deletions: 1 },
};

const diffResponse = {
  commit: {
    hash: commit.hash,
    shortHash: "abc1234",
    message: commit.message,
    author: commit.author,
    time: commit.time,
    branch: "main",
  },
  summary: { filesChanged: 2, additions: 4, deletions: 1 },
  files: [
    {
      path: "src/App.jsx",
      status: "modified",
      additions: 1,
      deletions: 1,
      hunks: [{
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        lines: [
          { type: "removed", content: "-old", oldLineNumber: 1, newLineNumber: null },
          { type: "added", content: "+new", oldLineNumber: null, newLineNumber: 1 },
        ],
      }],
    },
    {
      path: "README.md",
      status: "added",
      additions: 1,
      deletions: 0,
      hunks: [{
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: 1,
        lines: [{ type: "added", content: "+# CodeHub", oldLineNumber: null, newLineNumber: 1 }],
      }],
    },
  ],
  warnings: [],
};

const response = (body, ok = true, status = ok ? 200 : 500) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CommitHistory", () => {
  test("renders commit metadata and does not fetch diffs eagerly", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<CommitHistory repositoryId="repo-id" commits={[commit]} />);

    expect(screen.getByText("Update navigation")).toBeTruthy();
    expect(screen.getByText("abc1234")).toBeTruthy();
    expect(screen.getByText("Puskar")).toBeTruthy();
    expect(screen.getByText("+4")).toBeTruthy();
    expect(screen.getByText("−1")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("opens lazily, shows loading, switches files, collapses, and reuses cached data", async () => {
    let resolveFetch;
    const pending = new Promise((resolve) => { resolveFetch = resolve; });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockReturnValue(pending);
    render(<CommitHistory repositoryId="repo-id" commits={[commit]} />);

    fireEvent.click(screen.getByRole("button", { name: /view changes/i }));
    expect(screen.getByText("Loading commit changes…")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/repo/repo-id/commit/abc123456789/diff");

    resolveFetch(response(diffResponse));
    expect(await screen.findByText("-old")).toBeTruthy();
    expect(screen.getByText("+new")).toBeTruthy();

    fireEvent.click(screen.getByTitle("README.md"));
    expect(await screen.findByText("+# CodeHub")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /hide changes/i }));
    expect(screen.queryByText("+# CodeHub")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /view changes/i }));
    expect(await screen.findByText("-old")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("renders an API error and retries successfully", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(response({ error: "Historical diff unavailable" }, false, 500))
      .mockResolvedValueOnce(response(diffResponse));
    render(<CommitHistory repositoryId="repo-id" commits={[commit]} />);

    fireEvent.click(screen.getByRole("button", { name: /view changes/i }));
    expect(await screen.findByText("Historical diff unavailable")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(screen.getByText("-old")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
