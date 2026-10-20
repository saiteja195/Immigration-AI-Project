import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { jsonResponse, mockFetch, renderApp } from "@/test/helpers";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  mockFetch((url) => {
    if (url.endsWith("/auth/me")) return jsonResponse(200, { id: "1", email: "me@example.com", full_name: "Test User" });
    if (url.includes("/notifications")) return jsonResponse(200, { unread: 0, items: [] });
    if (url.includes("/reminders/check")) return jsonResponse(200, { unread: 0, items: [] });
    return jsonResponse(404, { detail: "unexpected " + url });
  });
  renderApp(
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<h1>Home page</h1>} />
        <Route path="tasks" element={<h1>Tasks page</h1>} />
        <Route path="cases" element={<h1>Cases page</h1>} />
      </Route>
    </Routes>,
  );
}

describe("AppShell navigation", () => {
  it("shows the new page after clicking a tab, and never hides it with an inline opacity", async () => {
    setup();
    expect(await screen.findByText("Home page")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("link", { name: "Tasks" })[0]);
    expect(await screen.findByText("Tasks page")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("link", { name: "Cases" })[0]);
    expect(await screen.findByText("Cases page")).toBeInTheDocument();
    // A JS-driven fade left pages stuck at opacity 0. The page change must use CSS only.
    expect(document.querySelector("main [style*='opacity']")).toBeNull();
  });
});
