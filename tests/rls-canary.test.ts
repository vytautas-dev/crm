import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client as PgClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The canary table is a throwaway built from docs/reference/rls-convention.md — it is NOT in
// the generated Database type, so the supabase clients are intentionally untyped and query
// results are cast to this local row shape at the read boundaries.
interface CanaryRow {
  id: string;
  user_id: string;
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
const DB_URL = requireEnv("SUPABASE_DB_URL");

const FIXTURE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/tests/fixtures/canary_table.sql");

// Two distinct signed-in contexts — isolation can only be proven with two separate sessions,
// not one client with auth.uid() swapped. Admin client uses the secret key for user lifecycle only.
const noPersist = { auth: { autoRefreshToken: false, persistSession: false } } as const;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, noPersist);
const clientA = createClient(SUPABASE_URL, ANON_KEY, noPersist);
const clientB = createClient(SUPABASE_URL, ANON_KEY, noPersist);

const stamp = Date.now();
const userA = { email: `canary-a-${stamp}@example.com`, password: `canary-a-${stamp}-pw` };
const userB = { email: `canary-b-${stamp}@example.com`, password: `canary-b-${stamp}-pw` };

let pg: PgClient;
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
  pg = new PgClient({ connectionString: DB_URL });
  await pg.connect();
  // Fixture drops-first, so this is idempotent across reruns.
  await pg.query(readFileSync(FIXTURE_PATH, "utf8"));

  userAId = await createConfirmedUser(admin, userA);
  userBId = await createConfirmedUser(admin, userB);

  await signIn(clientA, userA);
  await signIn(clientB, userB);
});

afterAll(async () => {
  // Always tear down, even on assertion failure — a leaked table or user makes reruns flaky.
  if (userAId) await admin.auth.admin.deleteUser(userAId);
  if (userBId) await admin.auth.admin.deleteUser(userBId);
  // pg may be undefined if beforeAll threw before connecting.
  if (typeof pg !== "undefined") {
    await pg.query("drop table if exists public.canary cascade");
    await pg.end();
  }
});

describe("RLS owner-scoped isolation (canary)", () => {
  it("A inserts a row owned by A (user_id defaulted from auth.uid())", async () => {
    const res = await clientA.from("canary").insert({}).select().single();
    expect(res.error).toBeNull();
    const row = res.data as CanaryRow | null;
    if (!row) throw new Error("insert returned no row");
    expect(row.user_id).toBe(userAId);
    rowId = row.id;
  });

  it("A sees its own row", async () => {
    const res = await clientA.from("canary").select();
    expect(res.error).toBeNull();
    const rows = (res.data ?? []) as CanaryRow[];
    expect(rows.map((r) => r.id)).toContain(rowId);
  });

  it("B sees no rows (SELECT is owner-filtered)", async () => {
    const res = await clientB.from("canary").select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("B cannot UPDATE A's row (silently filtered to zero rows)", async () => {
    // RLS does not error on writes it can't see — it affects zero rows. Assert the chained
    // .select() returns empty, NOT a thrown error.
    const res = await clientB
      .from("canary")
      .update({ created_at: new Date(0).toISOString() })
      .eq("id", rowId)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("B cannot DELETE A's row (silently filtered to zero rows)", async () => {
    const res = await clientB.from("canary").delete().eq("id", rowId).select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("A's row survives B's write attempts unchanged (the real isolation check)", async () => {
    const res = await clientA.from("canary").select().eq("id", rowId).single();
    expect(res.error).toBeNull();
    const row = res.data as CanaryRow | null;
    if (!row) throw new Error("A's row disappeared — B's delete was not isolated");
    // created_at was NOT rewound to epoch → B's update never applied.
    expect(new Date(row.created_at).getFullYear()).toBeGreaterThan(1970);
  });

  it("B cannot INSERT a row forged with A's user_id (WITH CHECK rejects — this case DOES error)", async () => {
    const res = await clientB.from("canary").insert({ user_id: userAId }).select();
    expect(res.data).toBeNull();
    expect(res.error).not.toBeNull();
  });
});
