import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Proves per-user isolation on the first real domain table, `companies`, through the
// real anon-key/JWT → auth.uid() path. Unlike the canary test there is no throwaway
// fixture — the table ships in the migration — so the clients are still intentionally
// untyped and results are cast to this local row shape at the read boundaries.
interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var ${name}. Run \`npx supabase start\` and populate .env (see .env.example).`);
  }
  return value;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const ANON_KEY = requireEnv("SUPABASE_KEY");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// Two distinct signed-in contexts — isolation can only be proven with two separate sessions,
// not one client with auth.uid() swapped. Admin client uses the secret key for user lifecycle
// and RLS-bypassing cleanup only.
const noPersist = { auth: { autoRefreshToken: false, persistSession: false } } as const;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, noPersist);
const clientA = createClient(SUPABASE_URL, ANON_KEY, noPersist);
const clientB = createClient(SUPABASE_URL, ANON_KEY, noPersist);

const stamp = Date.now();
const userA = { email: `companies-a-${stamp}@example.com`, password: `companies-a-${stamp}-pw` };
const userB = { email: `companies-b-${stamp}@example.com`, password: `companies-b-${stamp}-pw` };

let userAId = "";
let userBId = "";
let rowId = "";

async function createConfirmedUser(
  client: SupabaseClient,
  creds: { email: string; password: string },
): Promise<string> {
  const { data, error } = await client.auth.admin.createUser({
    email: creds.email,
    password: creds.password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function signIn(client: SupabaseClient, creds: { email: string; password: string }): Promise<void> {
  const { error } = await client.auth.signInWithPassword(creds);
  if (error) throw error;
}

beforeAll(async () => {
  userAId = await createConfirmedUser(admin, userA);
  userBId = await createConfirmedUser(admin, userB);

  await signIn(clientA, userA);
  await signIn(clientB, userB);
});

afterAll(async () => {
  // Always tear down, even on assertion failure — leaked rows/users make reruns flaky.
  // Deleting the users cascades to their companies (user_id ... on delete cascade), but
  // remove the created row explicitly too in case the users somehow survive.
  if (rowId) await admin.from("companies").delete().eq("id", rowId);
  if (userAId) await admin.auth.admin.deleteUser(userAId);
  if (userBId) await admin.auth.admin.deleteUser(userBId);
});

describe("RLS owner-scoped isolation (companies)", () => {
  it("A inserts a company owned by A (user_id defaulted from auth.uid())", async () => {
    const res = await clientA.from("companies").insert({ name: "Acme A" }).select().single();
    expect(res.error).toBeNull();
    const row = res.data as CompanyRow | null;
    if (!row) throw new Error("insert returned no row");
    expect(row.user_id).toBe(userAId);
    expect(row.status).toBe("lead"); // column default
    expect(row.archived_at).toBeNull();
    rowId = row.id;
  });

  it("A sees its own company", async () => {
    const res = await clientA.from("companies").select();
    expect(res.error).toBeNull();
    const rows = (res.data ?? []) as CompanyRow[];
    expect(rows.map((r) => r.id)).toContain(rowId);
  });

  it("B sees no companies (SELECT is owner-filtered)", async () => {
    const res = await clientB.from("companies").select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("B cannot UPDATE A's company (silently filtered to zero rows)", async () => {
    // RLS does not error on writes it can't see — it affects zero rows. Assert the chained
    // .select() returns empty, NOT a thrown error.
    const res = await clientB.from("companies").update({ name: "Hijacked" }).eq("id", rowId).select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("B cannot archive A's company (soft-delete UPDATE, silently filtered to zero rows)", async () => {
    // Archive is an UPDATE of archived_at, so it takes the same silent-filter path.
    const res = await clientB
      .from("companies")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", rowId)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("A's company survives B's write attempts unchanged (the real isolation check)", async () => {
    const res = await clientA.from("companies").select().eq("id", rowId).single();
    expect(res.error).toBeNull();
    const row = res.data as CompanyRow | null;
    if (!row) throw new Error("A's company disappeared — B's write was not isolated");
    expect(row.name).toBe("Acme A"); // B's rename never applied
    expect(row.archived_at).toBeNull(); // B's archive never applied
  });

  it("B cannot INSERT a company forged with A's user_id (WITH CHECK rejects — this case DOES error)", async () => {
    const res = await clientB.from("companies").insert({ name: "Forged", user_id: userAId }).select();
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });
});
