import "server-only";
import { sql } from "../db";
import { db, type Ctx } from "../session";

export const RULES = ["mandate", "silent", "cold", "deal"] as const;
export type Rule = (typeof RULES)[number];

/** Réglages et journal des automatisations de l'agence (tâches créées par public.run_automations). */
export async function getAutomations(ctx: Ctx) {
  return db(ctx, async (tx) => {
    const [o] = await tx`select coalesce(settings->'automations', '{}'::jsonb) as a from public.organizations where id = ${ctx.orgId}`;
    const counts = (await tx`select split_part(source, ':', 1) as rule, count(*)::int as n from public.tasks where source is not null and created_at > now() - interval '30 days' group by 1`) as unknown as { rule: string; n: number }[];
    const log = (await tx`select t.id, t.title, t.created_at, t.done_at, split_part(t.source, ':', 1) as rule, t.contact_id, t.property_id, t.deal_id, a.full_name as assignee
      from public.tasks t left join public.profiles a on a.id = t.assignee_id where t.source is not null order by t.created_at desc limit 12`) as unknown as Record<string, any>[];
    const on = (o?.a ?? {}) as Record<string, boolean>;
    return { on: Object.fromEntries(RULES.map((r) => [r, !!on[r]])) as Record<Rule, boolean>, counts: Object.fromEntries(counts.map((c) => [c.rule, c.n])) as Record<string, number>, log };
  });
}

/** Active ou coupe une règle (droit org.manage, vérifié aussi par la RLS de organizations). */
export async function setAutomation(ctx: Ctx, rule: Rule, on: boolean) {
  return db(ctx, async (tx) => (await tx`update public.organizations set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('automations', coalesce(settings->'automations', '{}'::jsonb) || jsonb_build_object(${rule}::text, ${on}::boolean)) where id = ${ctx.orgId} returning id`).length > 0);
}

/** Exécution immédiate pour l'agence courante (bouton « Lancer maintenant »). */
export async function runAutomationsNow(ctx: Ctx) {
  if (!ctx.caps.has("org.manage") || ctx.impersonating) return 0;
  const [r] = await sql`select public.run_automations(${ctx.orgId}::uuid) as n`;
  return Number(r?.n ?? 0);
}
