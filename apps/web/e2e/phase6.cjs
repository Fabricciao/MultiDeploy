// E2E phase 6 : facturation manuelle (aucun paiement dans le CRM) + tableau de bord plateforme.
// Prérequis : serveur dev lancé SANS BILLING_MODE (mode manuel par défaut).
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const root = (await sql`select id from auth.users where email = 'root@platform.demo'`)[0].id;
  const yael = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id;
  const eliezer = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const as = async (u) => { await ctx.clearCookies(); await ctx.addCookies([{ name: "dev_user", value: u, url: BASE }]); };
  for (const u of ["/fr/platform", `/fr/platform/${eliezer}`, "/fr/settings/plan"]) await fetch(`${BASE}${u}`).catch(() => {});
  await sql`update organizations set plan = 'pro', paid_until = null, billing_note = null, status = 'active' where id = ${eliezer}`;

  // tableau de bord plateforme
  await as(root); await p.goto(`${BASE}/fr/platform`); await p.waitForLoadState("networkidle");
  ok(await p.locator("text=Eliezer.immo").first().isVisible() && await p.locator("th:has-text('Facturation')").isVisible() && await p.locator("th:has-text('Propriétaire')").isVisible(), "tableau de bord : agences, facturation, propriétaire");
  ok(await p.locator("text=yael@eliezer.demo").first().isVisible() && /owner/.test(await p.locator("tbody").innerText()), "e-mail du propriétaire et répartition des rôles visibles");
  ok(await p.locator("td:has-text('Sans échéance')").first().isVisible(), "agence sans échéance signalée");
  await p.goto(`${BASE}/fr/platform?f=overdue`); ok((await p.locator("tbody tr").count()) === 0, "filtre « En retard » : aucune agence");
  await p.goto(`${BASE}/fr/platform?q=zzzz`); ok((await p.locator("tbody tr").count()) === 0, "recherche sans résultat");

  // fixer l'échéance depuis la fiche agence
  await p.goto(`${BASE}/fr/platform/${eliezer}`); await p.waitForLoadState("networkidle");
  const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  await p.fill('input[name="paid_until"]', future); await p.fill('input[name="billing_note"]', "Payé par virement"); await p.locator('form:has(input[value="billing"]) button').click(); await p.waitForURL(/ok=saved/);
  const row = (await sql`select paid_until::text d, billing_note n from organizations where id = ${eliezer}`)[0]; ok(row.d === future && row.n === "Payé par virement", "échéance et note enregistrées par la plateforme");
  await p.goto(`${BASE}/fr/platform`); ok(await p.locator("td:has-text('Expire bientôt')").first().isVisible(), "dans 10 jours → « Expire bientôt » dans le tableau de bord");
  await p.goto(`${BASE}/fr/platform?f=expiring`); ok((await p.locator("tbody tr").count()) === 1, "filtre « Expire bientôt »");
  ok((await sql`select count(*)::int n from platform_audit_log where action = 'set_billing' and organization_id = ${eliezer}`)[0].n >= 1, "action journalisée");

  // côté agence : lecture seule, aucun paiement
  await as(yael); await p.goto(`${BASE}/fr/settings/plan`); await p.waitForLoadState("networkidle");
  ok(await p.locator("text=Expire bientôt").first().isVisible() && await p.locator("text=Payé par virement").isVisible(), "l'agence voit son échéance et la note");
  ok((await p.locator('button:has-text("Choisir")').count()) === 0 && (await p.locator('button:has-text("Gérer la facturation")').count()) === 0, "aucun bouton de paiement ni de changement de plan");
  ok(await p.locator("text=administrateur de la plateforme").isVisible(), "message : contacter l'interlocuteur");
  const wh = await fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", body: "{}" }); ok(wh.status === 404, "webhook Stripe désactivé en mode manuel");
  // l'agence ne peut pas s'auto-attribuer un plan (même en SQL direct sous son identité)
  let blocked = false; try { await sql.begin(async (tx) => { await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: yael, role: "authenticated", org_id: eliezer })}, true)`; await tx`set local role authenticated`; await tx`update organizations set plan = 'agency_plus' where id = ${eliezer}`; }); } catch { blocked = true; }
  ok(blocked, "le propriétaire ne peut pas modifier son plan, même directement en base");
  await sql`update organizations set paid_until = current_date - 3 where id = ${eliezer}`;
  await as(root); await p.goto(`${BASE}/fr/platform?f=overdue`); ok((await p.locator("tbody tr").count()) === 1, "échéance dépassée → « En retard »");
  await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 6 : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
