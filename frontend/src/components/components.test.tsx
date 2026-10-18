import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";
import { Switch } from "./Switch";
import { Field } from "./Field";
import { CaseStage, stageTone } from "./CaseStage";

describe("Switch", () => {
  it("reports its state and toggles on click", async () => {
    const onChange = vi.fn();
    render(<Switch label="Email reminders" checked={false} onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Email reminders" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does nothing when disabled", async () => {
    const onChange = vi.fn();
    render(<Switch label="x" checked disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Checkbox", () => {
  it("is a labelled checkbox that flips its value", async () => {
    const onChange = vi.fn();
    render(<Checkbox checked label="Mark done" onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Mark done" });
    expect(box).toHaveAttribute("aria-checked", "true");
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("Field", () => {
  it("links its label and shows an error message", () => {
    render(<Field label="Email" error="Enter a valid email." />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });

  it("can show and hide a password", async () => {
    render(<Field label="Password" type="password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("CaseStage", () => {
  it("names the decision when a case is closed", () => {
    render(<CaseStage stage="approved" />);
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
  });

  it("picks a tone for each stage", () => {
    expect(stageTone("approved")).toBe("ok");
    expect(stageTone("denied")).toBe("danger");
    expect(stageTone("rfe")).toBe("warn");
    expect(stageTone("in_review")).toBe("accent");
  });
});
