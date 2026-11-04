import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type SendResult = { status: "sent" | "dry_run" | "failed"; providerId?: string; error?: string };

/** Envoi via Resend (API HTTP). Sans RESEND_API_KEY : « dry_run » (journalisé, rien n'est envoyé). */
export async function sendEmail(m: { to: string; subject: string; html: string; text: string; replyTo?: string; from?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Hors production, les e-mails « dry_run » sont déposés en JSON dans .data/outbox (lisibles par les développeurs et les tests E2E)
    if (process.env.NODE_ENV !== "production") { try { const dir = process.env.EMAIL_OUTBOX_DIR ?? join(process.cwd(), ".data", "outbox"); await mkdir(dir, { recursive: true }); await writeFile(join(dir, `${Date.now()}-${randomUUID().slice(0, 8)}.json`), JSON.stringify({ to: m.to, subject: m.subject, text: m.text, html: m.html, at: new Date().toISOString() }, null, 2)); } catch { /* best effort */ } }
    return { status: "dry_run" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: m.from ?? process.env.EMAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { status: "failed", error: body.message ?? `HTTP ${res.status}` };
    return { status: "sent", providerId: body.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "network" };
  }
}
