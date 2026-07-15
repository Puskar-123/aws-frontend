// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ThemeToggle from "../components/common/ThemeToggle";
import BrandLogo from "../components/common/BrandLogo";
import { ThemeProvider, useTheme } from "./ThemeContext";

let systemDark = false;
let systemListener;

const Probe = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return <div><output data-testid="theme">{theme}:{resolvedTheme}</output><button onClick={() => setTheme("dark")}>Use dark</button><button onClick={() => setTheme("light")}>Use light</button><button onClick={() => setTheme("system")}>Use system</button></div>;
};

const renderTheme = (child = <Probe />) => render(<MemoryRouter><ThemeProvider>{child}</ThemeProvider></MemoryRouter>);

beforeEach(() => {
  systemDark = false;
  systemListener = undefined;
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: vi.fn(() => ({
    matches: systemDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: vi.fn((event, listener) => { if (event === "change") systemListener = listener; }),
    removeEventListener: vi.fn((event, listener) => { if (event === "change" && systemListener === listener) systemListener = undefined; }),
  })) });
});

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe("ThemeProvider", () => {
  test.each(["dark", "light"])("loads the saved %s preference", async (preference) => {
    localStorage.setItem("codehub-theme", preference);
    renderTheme();
    expect(screen.getByTestId("theme").textContent).toBe(`${preference}:${preference}`);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe(preference));
  });

  test("uses and follows the operating-system theme when no preference is saved", async () => {
    systemDark = true;
    renderTheme();
    expect(screen.getByTestId("theme").textContent).toBe("system:dark");
    await waitFor(() => expect(systemListener).toBeTypeOf("function"));
    systemListener({ matches: false });
    await waitFor(() => expect(screen.getByTestId("theme").textContent).toBe("system:light"));
  });

  test("changes immediately, persists preferences, and resolves System without reloading", async () => {
    renderTheme();
    fireEvent.click(screen.getByRole("button", { name: "Use dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem("codehub-theme")).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Use light" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(localStorage.getItem("codehub-theme")).toBe("light");
    fireEvent.click(screen.getByRole("button", { name: "Use system" }));
    await waitFor(() => expect(screen.getByTestId("theme").textContent).toBe("system:light"));
    expect(localStorage.getItem("codehub-theme")).toBe("system");
  });
});

describe("ThemeToggle", () => {
  test("opens its menu, marks the active option, and retains CodeHub branding", () => {
    renderTheme(<><BrandLogo /><ThemeToggle /></>);
    expect(screen.getByRole("link", { name: "CodeHub home" })).toBeTruthy();
    expect(document.querySelector(".brand-logo__image")?.getAttribute("src")).toContain("contalsystem-icon.png");
    fireEvent.click(screen.getByRole("button", { name: "Appearance: system" }));
    expect(screen.getByRole("menu", { name: "Appearance" })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
  });

  test("selects Dark and closes without a page reload", async () => {
    renderTheme(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Appearance: system" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  test("Escape and outside pointer interaction close the menu", () => {
    renderTheme(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Appearance: system" });
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
