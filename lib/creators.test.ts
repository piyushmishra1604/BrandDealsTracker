import { describe, it, expect } from "vitest";
import { isCreatorInput, type CreatorInput } from "./creators";

const validInput: CreatorInput = {
  name: "Ankita Rath",
  email: "ankita@example.com",
  phone: "+919876543210",
  instagramHandle: "@ankitarath",
  category: "Fashion",
  notes: "Great engagement rates.",
};

describe("isCreatorInput", () => {
  it("accepts a fully valid creator", () => {
    expect(isCreatorInput(validInput)).toBe(true);
  });

  it("accepts a creator with only a name (everything else optional)", () => {
    expect(isCreatorInput({ name: "Jane Doe" })).toBe(true);
  });

  it("accepts empty-string optional fields", () => {
    expect(isCreatorInput({ name: "Jane Doe", email: "", phone: "", instagramHandle: "", category: "", notes: "" })).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(isCreatorInput({ ...validInput, name: "   " })).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(isCreatorInput({ email: "a@example.com" })).toBe(false);
  });

  it("rejects an invalid email format", () => {
    expect(isCreatorInput({ ...validInput, email: "not-an-email" })).toBe(false);
  });

  it("rejects a name longer than 120 chars", () => {
    expect(isCreatorInput({ ...validInput, name: "a".repeat(121) })).toBe(false);
  });

  it("rejects notes longer than 5000 chars", () => {
    expect(isCreatorInput({ ...validInput, notes: "a".repeat(5001) })).toBe(false);
  });

  it("rejects a non-object value", () => {
    expect(isCreatorInput(null)).toBe(false);
    expect(isCreatorInput("a string")).toBe(false);
  });
});
