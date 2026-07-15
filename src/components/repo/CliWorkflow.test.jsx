// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import RepositoryCodeMenu from "./RepositoryCodeMenu";
import CliDocsPage from "../docs/CliDocsPage";
import App from "../../App";

vi.mock("../Navbar", () => ({ default: () => <nav>CodeHub</nav> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("CodeHub CLI web workflow", () => {
  test("Code menu shows clone, existing-project, branch, protection, and role details", () => {
    render(<MemoryRouter><RepositoryCodeMenu repository={{ name: "project-name", owner: { username: "Puskar" } }} defaultBranch="main" protection={{ protected: true }} role="write" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.getByRole("dialog", { name: "CodeHub CLI" })).toBeTruthy();
    expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy();
    expect(screen.getByText("codehub clone Puskar/project-name")).toBeTruthy();
    expect(screen.getByText("codehub init Puskar/project-name")).toBeTruthy();
    expect(screen.getByText("Protected")).toBeTruthy(); expect(screen.getByText("Write")).toBeTruthy(); expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read the CodeHub CLI guide" }).getAttribute("href")).toBe("/docs/cli");
  });

  test("copy buttons use the clipboard and Escape closes the accessible modal", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<MemoryRouter><RepositoryCodeMenu repository={{ name: "project", owner: { username: "Puskar" } }} defaultBranch="main" protection={{ protected: false }} role="read" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Code" })); fireEvent.click(screen.getByRole("button", { name: "Copy clone command" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("codehub clone Puskar/project"));
    fireEvent.keyDown(document, { key: "Escape" }); expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("CLI documentation covers install, authentication, clone, protected branches, sync, errors, and logout", () => {
    render(<MemoryRouter><CliDocsPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "CodeHub CLI" })).toBeTruthy();
    expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy();
    expect(screen.getAllByText(/codehub login/).length).toBeGreaterThan(0); expect(screen.getByText(/codehub branch feature\/my-change/)).toBeTruthy();
    expect(screen.getByText("Branch protected")).toBeTruthy(); expect(screen.getByText("codehub logout")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Return to Dashboard/i }).every((link) => link.getAttribute("href") === "/dashboard")).toBe(true);
  });

  test("the public /docs/cli application route loads the CLI documentation", () => {
    render(<MemoryRouter initialEntries={["/docs/cli"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "CodeHub CLI" })).toBeTruthy();
    expect(screen.getByText("npm install -g codehub-sbs-cli")).toBeTruthy();
  });
});
