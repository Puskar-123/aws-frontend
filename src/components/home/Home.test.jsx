// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { AuthProvider } from "../../authContext";
import Home from "./Home";

const response = (body, ok = true) => ({ ok, status: ok ? 200 : 401, headers: { get: () => "application/json" }, json: vi.fn().mockResolvedValue(body), text: vi.fn().mockResolvedValue(JSON.stringify(body)) });
const renderHome = () => render(<MemoryRouter><AuthProvider><Home /></AuthProvider></MemoryRouter>);

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

test("logged-out landing page presents sign-in and signup calls to action", async () => {
  renderHome();
  expect(await screen.findByRole("heading", { name: "Build, collaborate, and ship code with CodeHub" })).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Get started" }).every((link) => link.getAttribute("href") === "/signup")).toBe(true);
  expect(screen.getAllByRole("link", { name: "Sign in" }).every((link) => link.getAttribute("href") === "/login")).toBe(true);
  expect(screen.getByText("Repository management")).toBeTruthy();
});

test("authenticated landing page replaces redundant auth links with app destinations", async () => {
  localStorage.setItem("token", "token"); localStorage.setItem("userId", "user-1");
  vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ user: { _id: "user-1", username: "puskar" } }));
  renderHome();
  const dashboardLinks = await screen.findAllByRole("link", { name: /dashboard/i });
  expect(dashboardLinks.every((link) => link.getAttribute("href") === "/dashboard")).toBe(true);
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/profile");
  expect(screen.queryByRole("link", { name: "Get started" })).toBeNull();
});
