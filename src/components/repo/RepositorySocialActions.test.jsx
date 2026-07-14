// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import RepositorySocialActions from "./RepositorySocialActions";
const response = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const repository = { _id: "repo-1", social: { starCount: 2, watcherCount: 1, forkCount: 0, starredByCurrentUser: false, watchedByCurrentUser: false, forkedByCurrentUser: false } };
beforeEach(() => localStorage.setItem("token", "token")); afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
test("renders accessible social controls and toggles star/watch counts", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).endsWith("/star") ? response({ starred: true, starCount: 3 }) : response({ watched: true, watcherCount: 2 })));
  render(<RepositorySocialActions repository={repository} onForked={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Star repository" }));
  expect(await screen.findByRole("button", { name: "Unstar repository" })).toBeTruthy(); expect(screen.getByText("3")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Watch repository" }));
  expect(await screen.findByRole("button", { name: "Unwatch repository" })).toBeTruthy();
});
test("rolls back optimistic star changes and reports duplicate fork errors", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({ error: "Network failed" }, 500)).mockResolvedValueOnce(response({ error: "You already forked this repository." }, 409));
  render(<RepositorySocialActions repository={repository} onForked={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Star repository" }));
  expect(await screen.findByRole("alert")).toBeTruthy(); expect(screen.getByRole("button", { name: "Star repository" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Fork repository" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("already forked"));
});
test("fork success returns the new repository ID", async () => {
  const onForked = vi.fn(); vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ repository: { _id: "fork-1" } }, 201));
  render(<RepositorySocialActions repository={repository} onForked={onForked} />); fireEvent.click(screen.getByRole("button", { name: "Fork repository" }));
  await waitFor(() => expect(onForked).toHaveBeenCalledWith("fork-1"));
});
