import { describe, expect, it } from "vitest";
import { normalizeUsername, validateUsername } from "./username";

describe("normalizeUsername", () => {
  it("trims and lowercases so names are case-insensitive", () => {
    expect(normalizeUsername("  Rahul_Mehta ")).toBe("rahul_mehta");
  });
});

describe("validateUsername", () => {
  it("accepts lowercase letters, digits and underscores within the length limits", () => {
    expect(validateUsername("abc")).toBeNull();
    expect(validateUsername("rahul_2024")).toBeNull();
    expect(validateUsername("a".repeat(30))).toBeNull();
  });

  it("rejects names shorter than 3 or longer than 30 characters", () => {
    expect(validateUsername("ab")).toMatch(/at least 3/);
    expect(validateUsername("a".repeat(31))).toMatch(/no more than 30/);
  });

  it("rejects spaces, dots, hyphens, and uppercase letters", () => {
    expect(validateUsername("has space")).toMatch(/only lowercase/);
    expect(validateUsername("dot.name")).toMatch(/only lowercase/);
    expect(validateUsername("dash-name")).toMatch(/only lowercase/);
    expect(validateUsername("Upper")).toMatch(/only lowercase/);
  });

  it("rejects reserved names that collide with app routes", () => {
    expect(validateUsername("admin")).toMatch(/reserved/);
    expect(validateUsername("settings")).toMatch(/reserved/);
  });
});
