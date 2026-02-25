import { validateCreateTransaction } from "../src/shared";

describe("Validation", () => {
  test("accepts valid transaction input", () => {
    const result = validateCreateTransaction({
      amount: 100,
      currency: "USD",
      reference: "INV-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(100);
      expect(result.data.currency).toBe("USD");
      expect(result.data.reference).toBe("INV-001");
    }
  });

  test("rejects missing amount", () => {
    const result = validateCreateTransaction({
      currency: "USD",
      reference: "INV-001",
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative amount", () => {
    const result = validateCreateTransaction({
      amount: -50,
      currency: "USD",
      reference: "INV-001",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("positive");
    }
  });

  test("rejects zero amount", () => {
    const result = validateCreateTransaction({
      amount: 0,
      currency: "USD",
      reference: "INV-001",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty currency", () => {
    const result = validateCreateTransaction({
      amount: 100,
      currency: "",
      reference: "INV-001",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Currency");
    }
  });

  test("rejects missing reference", () => {
    const result = validateCreateTransaction({
      amount: 100,
      currency: "USD",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty reference", () => {
    const result = validateCreateTransaction({
      amount: 100,
      currency: "USD",
      reference: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects null body", () => {
    const result = validateCreateTransaction(null);
    expect(result.success).toBe(false);
  });

  test("rejects undefined body", () => {
    const result = validateCreateTransaction(undefined);
    expect(result.success).toBe(false);
  });
});
