import type { Tables } from "@/db/database.types";

/**
 * Relationship status for a company (FR-005).
 * Single source of truth in TypeScript — mirrors the CHECK constraint in
 * `supabase/migrations/*_create_companies.sql`. Adding a value means editing both.
 */
export const COMPANY_STATUSES = ["lead", "in_progress", "negotiating", "investor", "inactive"] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** A persisted company row (owner-scoped via RLS). */
export type Company = Tables<"companies">;

/** Payload to create a company. `status` defaults to `lead` server-side when omitted. */
export interface CreateCompanyInput {
  name: string;
  status?: CompanyStatus;
}

/** Payload to edit a company. At least one field must be present. */
export interface UpdateCompanyInput {
  name?: string;
  status?: CompanyStatus;
}
