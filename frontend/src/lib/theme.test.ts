import { beforeEach, describe, expect, it } from "vitest";
import { getScheme, setScheme } from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
});

const meta = () => document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content;

describe("theme", () => {
  it("defaults to following the system", () => {
    expect(getScheme()).toBe("system");
  });

  it("pins light or dark and remembers it", () => {
    setScheme("dark");
    expect(meta()).toBe("dark");
    expect(localStorage.getItem("color-scheme")).toBe("dark");
    expect(getScheme()).toBe("dark");
    setScheme("light");
    expect(meta()).toBe("light");
  });

  it("goes back to the system setting and forgets the choice", () => {
    setScheme("dark");
    setScheme("system");
    expect(meta()).toBe("light dark");
    expect(localStorage.getItem("color-scheme")).toBeNull();
  });
});
