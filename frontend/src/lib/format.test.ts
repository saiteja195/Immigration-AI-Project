import { afterEach, describe, expect, it, vi } from "vitest";
import { daysLabel, daysUntil, greeting, tone } from "./format";

afterEach(() => vi.useRealTimers());

describe("tone", () => {
  it("is danger within 30 days, warn within 90, otherwise ok", () => {
    expect(tone(-5)).toBe("danger");
    expect(tone(30)).toBe("danger");
    expect(tone(31)).toBe("warn");
    expect(tone(90)).toBe("warn");
    expect(tone(91)).toBe("ok");
  });
});

describe("daysLabel", () => {
  it("reads naturally", () => {
    expect(daysLabel(-3)).toBe("3d overdue");
    expect(daysLabel(0)).toBe("Today");
    expect(daysLabel(1)).toBe("Tomorrow");
    expect(daysLabel(25)).toBe("25 days");
    expect(daysLabel(100)).toBe("3 months");
    expect(daysLabel(730)).toBe("2.0 years");
  });
});

describe("daysUntil and greeting", () => {
  it("counts calendar days from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 15, 0));
    expect(daysUntil("2026-10-28")).toBe(10);
    expect(daysUntil("2026-10-18")).toBe(0);
    expect(daysUntil("2026-10-17")).toBe(-1);
  });

  it("greets by time of day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 8));
    expect(greeting()).toBe("Good morning");
    vi.setSystemTime(new Date(2026, 9, 18, 14));
    expect(greeting()).toBe("Good afternoon");
    vi.setSystemTime(new Date(2026, 9, 18, 21));
    expect(greeting()).toBe("Good evening");
  });
});
