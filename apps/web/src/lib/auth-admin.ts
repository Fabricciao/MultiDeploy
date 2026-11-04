import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { supabaseEnv } from "./supabase/env";

/** Crée (ou retrouve) un utilisateur par e-mail. Dev : table auth locale. Prod : API Admin Supabase (clé service) — NON TESTÉ sans projet Supabase. */
export async function ensureUser(emailRaw: string): Promise<string> {
  const email = emailRaw.trim().toLowerCase();
  const env = supabaseEnv(), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) {
    const [e] = await sql`select id from auth.users where lower(email) = ${email}`;
    if (e) return e.id;
    const id = randomUUID();
    await sql`insert into auth.users (id, email) values (${id}, ${email})`;
    return id;
  }
  const h = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };
  const r = await fetch(`${env.url}/auth/v1/admin/users`, { method: "POST", headers: h, body: JSON.stringify({ email, email_confirm: true }) });
  if (r.ok) return ((await r.json()) as { id: string }).id;
  // déjà existant : recherche paginée
  for (let page = 1; page <= 20; page++) {
    const l = await fetch(`${env.url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: h });
    if (!l.ok) break;
    const u = ((await l.json()) as { users?: { id: string; email?: string }[] }).users ?? [];
    const hit = u.find((x) => x.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (u.length < 200) break;
  }
  throw new Error("auth_admin_failed");
}
