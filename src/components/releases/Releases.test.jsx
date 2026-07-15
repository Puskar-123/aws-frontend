// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ReleaseListPage from "./ReleaseListPage";
import NewReleasePage from "./NewReleasePage";
import ReleaseDetailPage from "./ReleaseDetailPage";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
vi.mock("../repository/MarkdownPreview", () => ({ default: ({ content }) => <div data-testid="markdown">{content}</div> }));
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const tag = { _id: "tag-1", name: "v1.0.0", targetCommitHash: "abcdef123456", target: { message: "Ship it" }, createdAt: "2026-07-15T10:00:00Z" };
const release = { _id: "release-1", tag, title: "CodeHub 1.0", body: "## Highlights", draft: false, prerelease: false, latest: true, publishedAt: "2026-07-15T10:00:00Z", createdAt: "2026-07-15T09:00:00Z", createdBy: { username: "ada" }, assets: [{ _id: "asset-1", name: "bundle.zip", size: 2048, downloadCount: 3 }] };
const Location = () => <output data-testid="location">{useLocation().pathname}</output>;

beforeEach(() => localStorage.setItem("token", "token"));
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("Releases", () => {
  test("lists published releases and switches to searchable tags", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).includes("/tags?") ? Promise.resolve(response({ tags: [tag], pagination: { page: 1, pages: 1 }, canManage: true })) : Promise.resolve(response({ releases: [release], pagination: { page: 1, pages: 1 }, counts: { published: 1, drafts: 0 }, canManage: true })));
    render(<MemoryRouter initialEntries={["/repo/repo-1/releases"]}><Routes><Route path="/repo/:id/releases" element={<ReleaseListPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "CodeHub 1.0" })).toBeTruthy();
    expect(screen.getByText("Latest")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
    expect(await screen.findByRole("heading", { name: "v1.0.0" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search releases and tags"), { target: { value: "v1" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("search=v1"))).toBe(true));
  });

  test("creates and publishes a release against an existing tag", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url, options = {}) => options.method === "POST" ? Promise.resolve(response({ release }, 201)) : Promise.resolve(response({ tags: [tag], canManage: true })));
    render(<MemoryRouter initialEntries={["/repo/repo-1/releases/new"]}><Routes><Route path="/repo/:id/releases/new" element={<NewReleasePage />} /><Route path="/repo/:id/releases/:releaseId" element={<Location />} /></Routes></MemoryRouter>);
    await screen.findByRole("option", { name: /v1.0.0/ });
    fireEvent.change(screen.getByLabelText("Release title"), { target: { value: "CodeHub 1.0" } });
    fireEvent.change(screen.getByPlaceholderText("Describe this release using Markdown"), { target: { value: "## Highlights" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish release" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/repo/repo-1/releases/release-1"));
    const payload = JSON.parse(fetchMock.mock.calls.find(([, options]) => options?.method === "POST")[1].body);
    expect(payload).toMatchObject({ tagId: "tag-1", title: "CodeHub 1.0", draft: false });
  });

  test("creates a draft with a new tag and explicit canonical target input", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_url, options = {}) => options.method === "POST" ? Promise.resolve(response({ release: { ...release, draft: true } }, 201)) : Promise.resolve(response({ tags: [], canManage: true })));
    render(<MemoryRouter initialEntries={["/repo/repo-1/releases/new"]}><Routes><Route path="/repo/:id/releases/new" element={<NewReleasePage />} /><Route path="/repo/:id/releases/:releaseId" element={<Location />} /></Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Tag name"), { target: { value: "v2.0.0" } });
    fireEvent.change(screen.getByLabelText("Target branch or commit"), { target: { value: "feature/release" } });
    fireEvent.change(screen.getByLabelText("Release title"), { target: { value: "CodeHub 2.0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
    const payload = JSON.parse(fetchMock.mock.calls.find(([, options]) => options?.method === "POST")[1].body);
    expect(payload).toMatchObject({ draft: true, newTag: { name: "v2.0.0", target: "feature/release" } });
  });

  test("release details render Markdown, assets, and management actions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ release: { ...release, draft: true, latest: false }, canManage: true }));
    render(<MemoryRouter initialEntries={["/repo/repo-1/releases/release-1"]}><Routes><Route path="/repo/:id/releases/:releaseId" element={<ReleaseDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "CodeHub 1.0" })).toBeTruthy();
    expect(screen.getByTestId("markdown").textContent).toBe("## Highlights");
    expect(screen.getByText("bundle.zip")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("CodeHub 1.0")).toBeTruthy();
  });
});
