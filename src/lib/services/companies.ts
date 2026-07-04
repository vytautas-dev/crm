import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { Company, CreateCompanyInput, UpdateCompanyInput } from "@/types";

/**
 * Centralizes every `companies` query so RLS filtering, the `archived_at is null`
 * active-list default, and archive semantics live in one tested place. Every
 * function takes an already-null-checked, authenticated Supabase client — the
 * database's RLS policies scope all rows to `auth.uid()`.
 */

type Client = SupabaseClient<Database>;

/** Discriminated result: `ok` carries data; failure carries a message. */
export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Active companies (not archived) for the current user, newest first.
 * RLS restricts rows to the authenticated user.
 */
export async function listActiveCompanies(client: Client): Promise<ServiceResult<Company[]>> {
  const { data, error } = await client
    .from("companies")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

/**
 * Insert a company for the current user. `user_id` is omitted so the column's
 * `default auth.uid()` + INSERT `with check` policy establish ownership.
 */
export async function createCompany(client: Client, input: CreateCompanyInput): Promise<ServiceResult<Company>> {
  const { data, error } = await client
    .from("companies")
    .insert({ name: input.name, status: input.status })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

/**
 * Update a company's editable fields. Chained `.select()` distinguishes
 * "updated mine" from RLS's silent zero-row match: an empty array = not
 * found / not owned, surfaced as `ok: true, data: null`.
 */
export async function updateCompany(
  client: Client,
  id: string,
  input: UpdateCompanyInput,
): Promise<ServiceResult<Company | null>> {
  const { data, error } = await client.from("companies").update(input).eq("id", id).select();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data[0] ?? null };
}

/**
 * Soft-archive: set `archived_at = now()`. Not a SQL DELETE — the row is
 * preserved. Chained `.select()` empty array = not found / not owned.
 */
export async function archiveCompany(client: Client, id: string): Promise<ServiceResult<Company | null>> {
  const { data, error } = await client
    .from("companies")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data[0] ?? null };
}
