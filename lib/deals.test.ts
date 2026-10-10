import { describe, it, expect } from "vitest";
import { isAcceptanceStatus, isAssignedDealInput, assignedDealDateError, todayDate } from "./deals";

describe("isAcceptanceStatus", () => {
  it("accepts the three valid values", () => {
    expect(isAcceptanceStatus("pending")).toBe(true);
    expect(isAcceptanceStatus("accepted")).toBe(true);
    expect(isAcceptanceStatus("declined")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAcceptanceStatus("approved")).toBe(false);
    expect(isAcceptanceStatus(null)).toBe(false);
    expect(isAcceptanceStatus(undefined)).toBe(false);
  });
});

describe("isAssignedDealInput", () => {
  it("accepts a minimal valid input", () => {
    expect(isAssignedDealInput({ amount: 500, dueDate: "2026-12-31" })).toBe(true);
  });

  it("accepts optional deliverables and notes", () => {
    expect(isAssignedDealInput({ amount: 500, dueDate: "2026-12-31", deliverables: [{ type: "Reel", quantity: 2 }], notes: "Priority campaign" })).toBe(true);
  });

  it("rejects a negative amount", () => {
    expect(isAssignedDealInput({ amount: -1, dueDate: "2026-12-31" })).toBe(false);
  });

  it("rejects a non-finite amount", () => {
    expect(isAssignedDealInput({ amount: Number.NaN, dueDate: "2026-12-31" })).toBe(false);
  });

  it("rejects a malformed due date", () => {
    expect(isAssignedDealInput({ amount: 500, dueDate: "31-12-2026" })).toBe(false);
  });

  it("rejects invalid deliverables", () => {
    expect(isAssignedDealInput({ amount: 500, dueDate: "2026-12-31", deliverables: [{ type: "Reel", quantity: 0 }] })).toBe(false);
  });

  it("rejects notes over the length limit", () => {
    expect(isAssignedDealInput({ amount: 500, dueDate: "2026-12-31", notes: "x".repeat(5001) })).toBe(false);
  });

  it("rejects a missing amount or due date", () => {
    expect(isAssignedDealInput({ dueDate: "2026-12-31" })).toBe(false);
    expect(isAssignedDealInput({ amount: 500 })).toBe(false);
  });
});

describe("assignedDealDateError", () => {
  const today = "2026-06-15";

  it("allows a due date of today", () => {
    expect(assignedDealDateError({ amount: 1, dueDate: today }, today)).toBeNull();
  });

  it("allows a future due date", () => {
    expect(assignedDealDateError({ amount: 1, dueDate: "2026-07-01" }, today)).toBeNull();
  });

  it("rejects a due date before today", () => {
    expect(assignedDealDateError({ amount: 1, dueDate: "2026-06-14" }, today)).toMatch(/today/i);
  });

  it("defaults to the real current date when none is passed", () => {
    expect(assignedDealDateError({ amount: 1, dueDate: todayDate() })).toBeNull();
  });
});
