import { describe, expect, it } from "vitest";

import { createCompanySchema, updateCompanySchema } from "@/lib/validation/companies";

// Pure unit tests — no DB. Guards the zod contract that the JSON routes lean on,
// independent of RLS. Kept in lockstep with COMPANY_STATUSES and the DTO types.

describe("createCompanySchema", () => {
  it("accepts a valid name with no status (status defaults server-side)", () => {
    const res = createCompanySchema.safeParse({ name: "Acme" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe("Acme");
      expect(res.data.status).toBeUndefined();
    }
  });

  it("accepts a valid name with a valid status", () => {
    const res = createCompanySchema.safeParse({ name: "Acme", status: "negotiating" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.status).toBe("negotiating");
  });

  it("trims surrounding whitespace from the name", () => {
    const res = createCompanySchema.safeParse({ name: "  Acme  " });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe("Acme");
  });

  it("rejects an empty name", () => {
    expect(createCompanySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name (empty after trim)", () => {
    expect(createCompanySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 200 characters", () => {
    expect(createCompanySchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });

  it("accepts a name of exactly 200 characters (boundary)", () => {
    expect(createCompanySchema.safeParse({ name: "a".repeat(200) }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(createCompanySchema.safeParse({ name: "Acme", status: "prospect" }).success).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(createCompanySchema.safeParse({ status: "lead" }).success).toBe(false);
  });
});

describe("updateCompanySchema", () => {
  it("accepts a partial update of name only", () => {
    const res = updateCompanySchema.safeParse({ name: "Renamed" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.name).toBe("Renamed");
  });

  it("accepts a partial update of status only", () => {
    const res = updateCompanySchema.safeParse({ status: "inactive" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.status).toBe("inactive");
  });

  it("accepts both fields together", () => {
    expect(updateCompanySchema.safeParse({ name: "Acme", status: "investor" }).success).toBe(true);
  });

  it("rejects an empty object (no fields to update)", () => {
    expect(updateCompanySchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(updateCompanySchema.safeParse({ status: "customer" }).success).toBe(false);
  });

  it("rejects an empty name when provided", () => {
    expect(updateCompanySchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name longer than 200 characters", () => {
    expect(updateCompanySchema.safeParse({ name: "a".repeat(201) }).success).toBe(false);
  });
});
