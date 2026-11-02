import { describe, expect, it } from "vitest";
import { dueLabel, formatBytes, initials } from "@/lib/format";
import { computeTaskStats, progressFromStats } from "@edutrack/shared/progress";

describe("format helpers", () => {
  it("builds initials without academic titles", () => {
    expect(initials("Dr. Meera Iyer")).toBe("MI");
    expect(initials("Aarav")).toBe("A");
  });

  it("formats file sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("describes due dates relative to today", () => {
    // Due dates are stored as the end of a calendar day in UTC, like the API does.
    const day = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59:59.999Z`;
    };
    const yesterday = day(-1);
    const inThree = day(3);
    expect(dueLabel(day(0))).toBe("Due today");
    expect(dueLabel(yesterday)).toBe("1 day overdue");
    expect(dueLabel(inThree)).toMatch(/Due in 3 days/);
    expect(dueLabel(null)).toBe("No due date");
  });
});

describe("shared progress maths", () => {
  it("computes progress as the share of done tasks", () => {
    const stats = computeTaskStats([{ status: "done" }, { status: "done" }, { status: "in_progress" }, { status: "todo", dueDate: "2000-01-01" }]);
    expect(stats).toMatchObject({ total: 4, done: 2, inProgress: 1, todo: 1, overdue: 1 });
    expect(progressFromStats(stats)).toBe(50);
    expect(progressFromStats({ total: 0, done: 0 })).toBe(0);
  });
});
