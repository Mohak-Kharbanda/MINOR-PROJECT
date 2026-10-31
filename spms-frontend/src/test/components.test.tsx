import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/ui/Progress";
import { StatusBadge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/States";

describe("ProgressBar", () => {
  it("exposes an accessible progressbar with the clamped value", () => {
    render(<ProgressBar value={137} label="Team progress" />);
    const bar = screen.getByRole("progressbar", { name: "Team progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });

  it("shows the '% complete' label", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByText("complete")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("uses human-readable status labels", () => {
    render(<StatusBadge status="pending_review" />);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("surfaces the API's error message", () => {
    const error = { response: { data: { success: false, message: "You do not have access to this project." } } };
    render(<ErrorState error={error} />);
    expect(screen.getByText("You do not have access to this project.")).toBeInTheDocument();
  });
});
