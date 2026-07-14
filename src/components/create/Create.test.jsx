// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Create from "./Create";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => "application/json" },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const Location = () => <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>;
const renderCreate = () => render(<MemoryRouter initialEntries={["/create"]}><Routes><Route path="*" element={<><Create /><Location /></>} /></Routes></MemoryRouter>);

const fillForm = ({ name = "new-project", description = "A project", privateRepo = false, readme = true } = {}) => {
  fireEvent.change(screen.getByLabelText(/Owner \/ Repository name/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: description } });
  if (privateRepo) fireEvent.click(screen.getByRole("radio", { name: /Private/i }));
  if (readme) fireEvent.click(screen.getByRole("checkbox", { name: /Add a README/i }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("token", "valid-token");
  localStorage.setItem("userId", "507f1f77bcf86cd799439012");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe("Create repository authentication and errors", () => {
  test("form renders and requires a repository name", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ user: { username: "Puskar" } }));
    renderCreate();
    expect(await screen.findByText("Puskar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    expect(screen.getByText("Repository name is required.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/repo/create"))).toBe(false);
  });

  test("submission uses the shared Bearer helper and sends the complete trimmed payload", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/repo/create")) return Promise.resolve(jsonResponse({ repository: { _id: "repo-1" } }, 201));
      return Promise.resolve(jsonResponse({ user: { username: "Puskar" } }));
    });
    renderCreate();
    await screen.findByText("Puskar");
    fillForm({ name: "  private-project  ", description: "  A private project  ", privateRepo: true });
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/repo/repo-1?branch=main"));
    const request = calls.find((call) => call.url.endsWith("/repo/create"));
    expect(request.options.headers.get("Authorization")).toBe("Bearer valid-token");
    expect(request.options.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(request.options.body)).toEqual({ name: "private-project", description: "A private project", visibility: "private", addReadme: true });
  });

  test.each([
    [200, { repo: { _id: "repo-200" } }, "/repo/repo-200?branch=main"],
    [201, { _id: "repo-201" }, "/repo/repo-201?branch=main"],
  ])("a %s success response opens the new main branch", async (status, body, expected) => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).endsWith("/repo/create") ? jsonResponse(body, status) : jsonResponse({ user: { username: "Puskar" } })));
    renderCreate();
    await screen.findByText("Puskar");
    fillForm({ readme: false });
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe(expected));
  });

  test.each([
    [400, "Repository name is invalid."],
    [403, "You do not have permission."],
    [409, "Repository already exists!"],
    [500, "Unable to create repository."],
  ])("a %s response displays its error without navigating or clearing values", async (status, message) => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).endsWith("/repo/create") ? jsonResponse({ error: message }, status) : jsonResponse({ user: { username: "Puskar" } })));
    renderCreate();
    await screen.findByText("Puskar");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/create");
    expect(screen.getByLabelText(/Owner \/ Repository name/i).value).toBe("new-project");
  });

  test("network failure remains inline and does not redirect", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).endsWith("/repo/create") ? Promise.reject(new TypeError("offline")) : Promise.resolve(jsonResponse({ user: { username: "Puskar" } })));
    renderCreate();
    await screen.findByText("Puskar");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    expect(await screen.findByText("Unable to connect to the server. Please try again.")).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/create");
  });

  test("duplicate clicks are blocked while the authenticated request is pending", async () => {
    let resolveCreate; let creates = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (String(url).endsWith("/repo/create")) { creates += 1; return new Promise((resolve) => { resolveCreate = resolve; }); }
      return Promise.resolve(jsonResponse({ user: { username: "Puskar" } }));
    });
    renderCreate();
    await screen.findByText("Puskar");
    fillForm();
    const button = screen.getByRole("button", { name: "Create repository" });
    fireEvent.click(button); fireEvent.submit(button.closest("form"));
    expect((await screen.findByRole("button", { name: "Creating repository..." })).disabled).toBe(true);
    expect(creates).toBe(1);
    resolveCreate(jsonResponse({ repository: { _id: "repo-one" } }, 201));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("repo-one"));
  });

  test("a 401 emits the central unauthorized event instead of handling unrelated errors as logout", async () => {
    let unauthorized = 0;
    window.addEventListener("codehub:unauthorized", () => { unauthorized += 1; }, { once: true });
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => Promise.resolve(String(url).endsWith("/repo/create") ? jsonResponse({ error: "Authentication required" }, 401) : jsonResponse({ user: { username: "Puskar" } })));
    renderCreate(); await screen.findByText("Puskar"); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create repository" }));
    expect(await screen.findByText("Authentication required")).toBeTruthy();
    expect(unauthorized).toBe(1);
  });
});
