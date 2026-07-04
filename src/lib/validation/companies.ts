import { z } from "zod";
import { COMPANY_STATUSES } from "@/types";

/**
 * Single source of API input validation for companies, reused by the JSON
 * routes and the validator unit tests. Kept in lockstep with the DTO contracts
 * in `src/types.ts` and the SQL CHECK constraint on `companies.status`.
 */

const nameField = z.string().trim().min(1, "Name is required").max(200, "Name must be 200 characters or fewer");
const statusField = z.enum(COMPANY_STATUSES);

/** Create payload: name required, status optional (defaults to `lead` server-side). */
export const createCompanySchema = z.object({
  name: nameField,
  status: statusField.optional(),
});

/** Update payload: all fields optional, but reject an empty object. */
export const updateCompanySchema = z
  .object({
    name: nameField.optional(),
    status: statusField.optional(),
  })
  .refine((data) => data.name !== undefined || data.status !== undefined, {
    message: "At least one field must be provided",
  });

export type CreateCompanySchema = z.infer<typeof createCompanySchema>;
export type UpdateCompanySchema = z.infer<typeof updateCompanySchema>;
