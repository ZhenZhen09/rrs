// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DispatchStatusTabs } from "../DispatchStatusTabs";

describe("DispatchStatusTabs", () => {
  it("shows an icon, count, and small label for every filter", () => {
    const onChange = vi.fn();
    render(
      <DispatchStatusTabs
        selected="pending"
        counts={{ all: 12, pending: 3, active: 4, overdue: 2, completed: 5 }}
        onChange={onChange}
      />,
    );

    const tabs = [
      ["All, 12 requests", "All"],
      ["Pending, 3 requests", "Pending"],
      ["Active, 4 requests", "Active"],
      ["Overdue, 2 requests", "Overdue"],
      ["Done, 5 requests", "Done"],
    ] as const;

    for (const [accessibleName, label] of tabs) {
      const tab = screen.getByRole("tab", { name: accessibleName });
      expect(tab.querySelector("svg")).not.toBeNull();
      expect(screen.getByText(label, { exact: true }).className).toContain("text-[8px]");
    }

    expect(screen.getByRole("tab", { name: "Pending, 3 requests" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Overdue, 2 requests" }));
    expect(onChange).toHaveBeenCalledWith("overdue");
  });
});
