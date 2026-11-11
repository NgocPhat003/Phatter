import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { useThemeStore } from "../store/useThemeStore";

describe("MainLayout Navigation & Theme Toggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useThemeStore.getState().setTheme("light");
  });

  it("does not render the removed Settings nav item", () => {
    render(
      <MemoryRouter>
        <MainLayout currentUser="sarah_dev">
          <div>Feed content</div>
        </MainLayout>
      </MemoryRouter>
    );

    expect(screen.queryByTitle("Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("toggles between Dark Mode and Light Mode from the sidebar", () => {
    render(
      <MemoryRouter>
        <MainLayout currentUser="sarah_dev">
          <div>Feed content</div>
        </MainLayout>
      </MemoryRouter>
    );

    const toggleBtn = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(screen.getByText("Dark Mode")).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggleBtn);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("phatter-theme")).toBe("dark");
    expect(screen.getByText("Light Mode")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to light mode/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
