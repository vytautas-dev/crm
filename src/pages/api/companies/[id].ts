import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { archiveCompany, updateCompany } from "@/lib/services/companies";
import { updateCompanySchema } from "@/lib/validation/companies";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const PATCH: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured" }, 503);
  }
  if (!context.locals.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const id = context.params.id;
  if (!id) {
    return json({ error: "Missing company id" }, 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, 400);
  }

  const result = await updateCompany(supabase, id, parsed.data);
  if (!result.ok) {
    console.error("companies API error:", result.error);
    return json({ error: "Something went wrong" }, 500);
  }
  if (!result.data) {
    return json({ error: "Company not found" }, 404);
  }
  return json({ company: result.data }, 200);
};

export const DELETE: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json({ error: "Supabase is not configured" }, 503);
  }
  if (!context.locals.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const id = context.params.id;
  if (!id) {
    return json({ error: "Missing company id" }, 400);
  }

  const result = await archiveCompany(supabase, id);
  if (!result.ok) {
    console.error("companies API error:", result.error);
    return json({ error: "Something went wrong" }, 500);
  }
  if (!result.data) {
    return json({ error: "Company not found" }, 404);
  }
  return json({ company: result.data }, 200);
};
