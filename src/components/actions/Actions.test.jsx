// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ActionsPage from "./ActionsPage";
import WorkflowRunPage from "./WorkflowRunPage";
import PullRequestChecks from "./PullRequestChecks";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
const id = "507f1f77bcf86cd799439011";
const response = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: async () => body, text: async () => JSON.stringify(body) });
const run = { _id: "run-1", workflowName: "CI", attempt: 1, status: "failure", branch: "main", commitHash: "abcdef1234567890", commitMessage: "Fix tests", trigger: "push", actor: { username: "Dev" }, durationMs: 1200, createdAt: "2026-07-15T00:00:00Z", jobs: [{ _id: "job-1", name: "test", status: "failure", durationMs: 1000, steps: [{ _id: "step-1", name: "Test", command: "npm test", status: "failure", durationMs: 900, logPreview: "2 tests failed" }] }] };

beforeEach(() => localStorage.setItem("token", "test-token"));
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("Actions UI", () => {
  test("renders workflow history, filters, invalid definitions, and pagination", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const value = String(url); calls.push(value);
      if (value.includes("/actions/runs?")) return Promise.resolve(response({ runs: [run], pagination: { page: 1, pages: 2 }, canManage: true }));
      if (value.endsWith("/actions/workflows")) return Promise.resolve(response({ workflows: [{ _id: "wf-1", name: "CI", path: ".codehub/workflows/ci.yml", validationStatus: "invalid", validationErrors: ["bad YAML"] }] }));
      return Promise.resolve(response({ defaultBranch: "main", branches: [{ name: "main" }, { name: "feature" }] }));
    });
    render(<MemoryRouter initialEntries={[`/repo/${id}/actions`]}><Routes><Route path="/repo/:id/actions" element={<ActionsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Fix tests")).toBeTruthy();
    expect(screen.getByText(/Invalid: bad YAML/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Workflow status"), { target: { value: "failure" } });
    fireEvent.change(screen.getByLabelText("Branch"), { target: { value: "feature" } });
    fireEvent.change(screen.getByLabelText("Event"), { target: { value: "pull_request" } });
    await waitFor(() => expect(calls.some((value) => value.includes("status=failure") && value.includes("branch=feature") && value.includes("event=pull_request"))).toBe(true));
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });

  test("renders run detail, expands sanitized text logs, and offers rerun", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(response(String(url).endsWith("/logs") ? { logs: [{ jobId: "job-1", steps: [{ stepId: "step-1", log: "2 tests failed" }] }] } : { run, canManage: true, runnerMode: "mock" })));
    render(<MemoryRouter initialEntries={[`/repo/${id}/actions/runs/run-1`]}><Routes><Route path="/repo/:id/actions/runs/:runId" element={<WorkflowRunPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /CI/ })).toBeTruthy();
    expect(screen.getByText(/Safe mock runner/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Test/ }));
    expect(screen.getByRole("region", { name: "Test logs" }).textContent).toContain("2 tests failed");
    expect(screen.getByRole("button", { name: "Rerun workflow" })).toBeTruthy();
  });

  test("shows only checks associated with the current PR head response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ checks: [{ _id: "check-1", name: "CI / test", status: "completed", conclusion: "success", detailsUrl: `/repo/${id}/actions/runs/run-1` }], summary: { success: 1, failure: 0, pending: 0 } }));
    render(<MemoryRouter><PullRequestChecks repositoryId={id} number={4} /></MemoryRouter>);
    expect(await screen.findByText("CI / test")).toBeTruthy();
    expect(screen.getByText(/1 passed/)).toBeTruthy();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain("/pulls/4/checks");
  });
});
