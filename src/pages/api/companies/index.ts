import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { createCompany, listActiveCompanies } from "@/lib/services/companies";
import { createCompanySchema } from "@/lib/validation/companies";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured" }, 503);
  }
  if (!context.locals.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const result = await listActiveCompanies(supabase);
  if (!result.ok) {
    console.error("companies API error:", result.error);
    return json({ error: "Something went wrong" }, 500);
  }
  return json({ companies: result.data }, 200);
};

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured" }, 503);
  }
  if (!context.locals.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  const result = await createCompany(supabase, parsed.data);
  if (!result.ok) {
    console.error("companies API error:", result.error);
    return json({ error: "Something went wrong" }, 500);
  }
  return json({ company: result.data }, 201);
};
