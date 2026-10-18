import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import { jsonResponse, mockFetch, renderApp } from "@/test/helpers";

afterEach(() => vi.unstubAllGlobals());

function routes(overrides: Record<string, () => Response> = {}) {
  return mockFetch((url) => {
    const key = Object.keys(overrides).find((k) => url.endsWith(k));
    if (key) return overrides[key]();
    if (url.endsWith("/auth/me")) return jsonResponse(401, { detail: "Not logged in" });
    if (url.endsWith("/auth/config")) return jsonResponse(200, { signups_open: true });
    return jsonResponse(404, { detail: "unexpected " + url });
  });
}

describe("Login page", () => {
  it("shows the sign up link while signups are open", async () => {
    routes();
    renderApp(<Login />);
    expect(await screen.findByRole("link", { name: "Create an account" })).toBeInTheDocument();
  });

  it("hides the sign up link when signups are closed", async () => {
    routes({ "/auth/config": () => jsonResponse(200, { signups_open: false }) });
    renderApp(<Login />);
    await screen.findByRole("button", { name: "Sign in" });
    await waitFor(() => expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument());
  });

  it("sends the credentials and shows the server's error for a wrong password", async () => {
    const fetchMock = routes({ "/auth/login": () => jsonResponse(401, { detail: "Wrong email or password" }) });
    renderApp(<Login />);
    await userEvent.type(await screen.findByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope-nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password");
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/auth/login"))!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ email: "me@example.com", password: "nope-nope" });
  });

  it("shows the lockout message after too many attempts", async () => {
    routes({ "/auth/login": () => jsonResponse(429, { detail: "Too many wrong attempts. Please wait a few minutes and try again." }) });
    renderApp(<Login />);
    await userEvent.type(await screen.findByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many wrong attempts");
  });
});
