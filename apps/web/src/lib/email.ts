import "server-only";

export type SendResult = { status: "sent" | "dry_run" | "failed"; providerId?: string; error?: string };

/** Envoi via Resend (API HTTP). Sans RESEND_API_KEY : « dry_run » (journalisé, rien n'est envoyé). */
export async function sendEmail(m: { to: string; subject: string; html: string; text: string; replyTo?: string; from?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "dry_run" };
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
