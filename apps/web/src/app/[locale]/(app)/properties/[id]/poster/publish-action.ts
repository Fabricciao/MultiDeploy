"use server";
import { headers } from "next/headers";
import { getCtx } from "@/lib/session";
import { db } from "@/lib/session";
import { sql } from "@/lib/db";
import { signToken } from "@/lib/crypto";
import { getConnectionConfig, type FacebookCfg, type InstagramCfg } from "@/lib/data/connections";
import { publishFacebookPhoto, publishInstagram } from "@/lib/integrations/meta";

export type PublishState = { ok?: true; error?: string; postId?: string } | null;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function publishPosterAction(posterId: string, target: "facebook" | "instagram", _p: PublishState, fd: FormData): Promise<PublishState> {
  const locale = (["fr", "he", "en"].includes(String(fd.get("locale"))) ? String(fd.get("locale")) : "fr");
  if (!uuid.test(posterId)) return { error: "not_found" };
  const ctx = await getCtx(locale);
  if (!ctx.caps.has("posters.create") || ctx.impersonating) return { error: "forbidden" };
  const [p] = await db(ctx, (tx) => tx`select id, property_id from public.poster_generations where id = ${posterId}`);
  if (!p) return { error: "not_found" };
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 2000);
  const h = await headers();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${base}/api/public/poster/${posterId}?t=${encodeURIComponent(signToken({ p: posterId }, 3600))}`;
  try {
    let postId: string;
    if (target === "facebook") { const cfg = await getConnectionConfig<FacebookCfg>(ctx.orgId, "facebook"); if (!cfg) return { error: "not_connected" }; postId = (await publishFacebookPhoto(cfg, url, caption)).id ?? ""; }
    else { const cfg = await getConnectionConfig<InstagramCfg>(ctx.orgId, "instagram"); if (!cfg) return { error: "not_connected" }; postId = (await publishInstagram(cfg, url, caption)).id ?? ""; }
    await sql`insert into public.activities (organization_id, kind, property_id, actor_id, summary, payload) values (${ctx.orgId}, 'poster_published', ${p.property_id}, ${ctx.userId}, ${target}, ${sql.json({ poster_id: posterId, target, post_id: postId })})`;
    return { ok: true, postId };
  } catch (e) { return { error: "publish_failed" }; }
}
