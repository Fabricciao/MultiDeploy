// E2E phase 3 : console plateforme, impersonation en lecture seule, équipe/invitations, sièges, plans, quotas, Stripe, résolution d'agence par hôte.
// Prérequis : serveur dev lancé avec  STRIPE_WEBHOOK_SECRET=whsec_e2e APP_DOMAINS=multideploy.test  (voir README)
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const sharp = require("sharp");
const { createHmac, randomBytes } = require("node:crypto");
const fs = require("node:fs"), path = require("node:path");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
const OUTBOX = path.join(__dirname, "..", ".data", "outbox");
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };
const as = async (ctx, userId) => { await ctx.clearCookies(); await ctx.addCookies([{ name: "dev_user", value: userId, url: BASE }]); };

(async () => {
  fs.rmSync(OUTBOX, { recursive: true, force: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const root = (await sql`select id from profiles where full_name like 'Fabrice%'`)[0].id;
  const yael = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id;
  const david = (await sql`select id from profiles where full_name = 'David Mizrahi'`)[0].id;
  const eliezer = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;

  // ── 1. console plateforme : accès, création d'agence, garde-fous ──
  await as(ctx, yael); await p.goto(`${BASE}/fr/platform`);
  ok(!p.url().includes("/platform"), "un propriétaire d'agence ne peut pas ouvrir la console plateforme");
  await as(ctx, root); await p.goto(`${BASE}/fr`);
  ok(p.url().includes("/fr/platform"), "l'administrateur de plateforme (sans agence) est dirigé vers la console");
  await p.fill('input[name="name_fr"]', "Sharon Estates"); await p.fill('input[name="slug"]', "sharon"); await p.fill('input[name="owner_email"]', "sharon@example.test"); await p.selectOption('select[name="plan"]', "starter");
  await p.click('button:has-text("Créer l\'agence")'); await p.waitForURL(/\/platform\/[0-9a-f-]{36}\?ok=created/);
  const [sh] = await sql`select id, plan from organizations where slug = 'sharon'`;
  ok(sh && sh.plan === "starter", "agence créée avec le plan choisi");
  ok((await sql`select count(*)::int n from pipeline_stages where organization_id = ${sh.id}`)[0].n === 8 && (await sql`select count(*)::int n from memberships where organization_id = ${sh.id} and role = 'owner'`)[0].n === 1, "pipeline par défaut + propriétaire créés");
  ok((await sql`select coalesce(sum(delta),0)::int c from ai_credit_ledger where organization_id = ${sh.id}`)[0].c === 50, "50 crédits d'essai offerts");
  ok((await sql`select count(*)::int n from platform_audit_log where action = 'create_agency' and organization_id = ${sh.id}`)[0].n === 1, "création tracée dans le journal plateforme");
  ok(fs.readdirSync(OUTBOX).some((f) => JSON.parse(fs.readFileSync(path.join(OUTBOX, f))).to === "sharon@example.test"), "e-mail d'accès envoyé au propriétaire");
  await p.goto(`${BASE}/fr/platform`);
  for (const [slug, msg] of [["sharon", "déjà utilisé"], ["admin", "réservé"], ["A_B", "invalide"]]) {
    await p.fill('input[name="name_fr"]', "X"); await p.fill('input[name="owner_email"]', "x@example.test"); await p.evaluate(() => document.querySelector('input[name="slug"]').removeAttribute("pattern")); await p.fill('input[name="slug"]', slug);
    await p.click('button:has-text("Créer l\'agence")'); await p.waitForSelector(`[role="alert"]:has-text("${msg}")`);
  }
  ok(true, "identifiant déjà pris / réservé / invalide : refusés avec message");

  // ── 2. impersonation : lecture seule imposée par la base, tracée, bandeau ──
  await p.goto(`${BASE}/fr/platform/${eliezer}`);
  await p.click('button:has-text("Voir comme l\'agence")'); await p.waitForURL(/\/fr$/);
  ok(await p.locator("text=Mode support — lecture seule").isVisible(), "bandeau « mode support » affiché");
  await p.goto(`${BASE}/fr/clients`); ok((await p.locator("tbody tr").count()) > 0, "impersonation : l'admin voit les données de l'agence");
  await p.goto(`${BASE}/fr/clients/new`); await p.fill('input[name="first_name"]', "Pirate"); await p.click('button:has-text("Enregistrer")'); await p.waitForTimeout(1200);
  ok((await sql`select count(*)::int n from contacts where first_name = 'Pirate'`)[0].n === 0, "impersonation : toute écriture est refusée");
  ok((await sql`select count(*)::int n from audit_log where organization_id = ${eliezer} and action = 'SUPPORT_START'`)[0].n === 1, "session de support visible dans le journal de l'agence");
  await p.goto(`${BASE}/fr`); await p.click('button:has-text("Quitter")'); await p.waitForURL(/\/platform/);
  ok((await sql`select count(*)::int n from platform_audit_log where action in ('impersonate_start','impersonate_stop')`)[0].n === 2, "début et fin de support tracés (plateforme)");
  await ctx.addCookies([{ name: "imp_org", value: eliezer, url: BASE }]); await as(ctx, yael); await ctx.addCookies([{ name: "imp_org", value: sh.id, url: BASE }]);
  await p.goto(`${BASE}/fr/properties`); ok((await p.locator('form[role="status"]:has-text("Mode support")').count()) === 0 && (await p.locator("tbody tr").count()) > 0, "un cookie d'impersonation forgé par un non-admin plateforme est ignoré");

  // ── 3. équipe : invitation (jeton haché), compte inadapté, acceptation, sièges, dernier owner ──
  await as(ctx, yael); fs.rmSync(OUTBOX, { recursive: true, force: true });
  await p.goto(`${BASE}/fr/settings/team`);
  await p.fill('input[name="email"]', "newbie@example.test"); await p.click('button:has-text("Envoyer l\'invitation")'); await p.waitForSelector("text=Invitation envoyée");
  const [inv] = await sql`select token_hash, email, role from invitations where lower(email) = 'newbie@example.test'`;
  ok(inv && inv.token_hash.length === 64 && inv.role === "agent", "invitation créée ; le jeton n'est stocké que haché (SHA-256)");
  const mail = JSON.parse(fs.readFileSync(path.join(OUTBOX, fs.readdirSync(OUTBOX)[0]))); const token = /invite\/([0-9a-f]{48})/.exec(mail.text)[1];
  ok(createHmac("sha256", "x") && require("node:crypto").createHash("sha256").update(token).digest("hex") === inv.token_hash, "le lien reçu correspond au hachage stocké");
  const newbie = randomBytes(16).toString("hex"), nid = `${newbie.slice(0, 8)}-${newbie.slice(8, 12)}-4${newbie.slice(13, 16)}-8${newbie.slice(17, 20)}-${newbie.slice(20, 32)}`;
  await sql`insert into auth.users (id, email) values (${nid}, 'newbie@example.test')`;
  await as(ctx, david); await p.goto(`${BASE}/fr/invite/${token}`); await p.click('button:has-text("Accepter")'); await p.waitForSelector("text=autre adresse");
  ok(true, "un autre compte ne peut pas accepter l'invitation");
  await as(ctx, nid); await p.goto(`${BASE}/fr/invite/${token}`); await p.click('button:has-text("Accepter")'); await p.waitForURL(/\/fr$/);
  ok((await sql`select role from memberships where user_id = ${nid} and organization_id = ${eliezer}`)[0]?.role === "agent", "invitation acceptée : membre « agent »");
  await p.goto(`${BASE}/fr/invite/${token}`); ok((await p.title()).length >= 0 && (await p.locator("text=404").count() + await p.locator("text=This page could not be found").count()) > 0, "invitation à usage unique (le lien ne fonctionne plus)");
  await as(ctx, yael);
  const n = (await sql`select count(*)::int n from memberships where organization_id = ${eliezer} and status = 'active'`)[0].n;
  await sql`update organizations set settings = settings || ${sql.json({ seats_override: n })} where id = ${eliezer}`;
  await p.goto(`${BASE}/fr/settings/team`); await p.fill('input[name="email"]', "overflow@example.test"); await p.click('button:has-text("Envoyer l\'invitation")'); await p.waitForSelector("text=Limite de sièges");
  ok(true, "limite de sièges du plan : invitation refusée");
  await sql`update organizations set settings = settings - 'seats_override' where id = ${eliezer}`;
  await p.goto(`${BASE}/fr/settings/team`);
  await p.locator("tbody tr", { hasText: "Yaël" }).locator("select").selectOption("admin"); await p.locator("tbody tr", { hasText: "Yaël" }).locator('button:has-text("OK")').click();
  await p.waitForSelector("text=au moins un propriétaire");
  ok((await sql`select role from memberships where user_id = ${yael} and organization_id = ${eliezer}`)[0].role === "owner", "dernier propriétaire : rétrogradation refusée");
  await as(ctx, david); await p.goto(`${BASE}/fr/settings/team`); ok(await p.locator("text=Réservé aux administrateurs").isVisible(), "un agent n'accède pas à la gestion d'équipe");

  // ── 4. plan, quota de stockage, paiement non configuré ──
  await as(ctx, yael); await p.goto(`${BASE}/fr/settings/plan`);
  ok(await p.locator("text=Plan actuel").isVisible() && (await p.locator('button:has-text("Choisir ce plan")').count()) >= 2, "page Plan : usage et offres affichés");
  await p.click('button:has-text("Choisir ce plan") >> nth=0'); await p.waitForSelector("text=paiement en ligne est indisponible");
  ok(true, "paiement non configuré : message clair (aucune erreur)");
  const prop = (await sql`select id from properties where organization_id = ${eliezer} and status = 'active' limit 1`)[0].id;
  await sql`update organizations set settings = settings || ${sql.json({ storage_override: 1 })} where id = ${eliezer}`;
  const noise = await sharp(randomBytes(1600 * 1100 * 3), { raw: { width: 1600, height: 1100, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  await p.goto(`${BASE}/fr/properties/${prop}`); await p.setInputFiles('input[name="photos"]', [{ name: "a.jpg", mimeType: "image/jpeg", buffer: noise }, { name: "b.jpg", mimeType: "image/jpeg", buffer: noise }]);
  await p.click('button:has-text("Téléverser")'); await p.waitForSelector("text=quota de stockage");
  ok((await sql`select coalesce(sum(bytes),0)::int b from property_media where organization_id = ${eliezer}`)[0].b <= 1048576 + 1900000, "quota de stockage appliqué : le dépassement est refusé");
  await sql`update organizations set settings = settings - 'storage_override' where id = ${eliezer}`;

  // ── 5. Stripe : webhook signé, idempotent, mise à jour du plan ──
  const evt = { id: "evt_e2e_1", type: "checkout.session.completed", data: { object: { client_reference_id: sh.id, customer: "cus_e2e", subscription: "sub_e2e", metadata: { plan: "pro" } } } };
  const body = JSON.stringify(evt), ts = Math.floor(Date.now() / 1000);
  const sig = `t=${ts},v1=${createHmac("sha256", "whsec_e2e").update(`${ts}.${body}`).digest("hex")}`;
  const post = (bd, sg) => fetch(`${BASE}/api/webhooks/stripe`, { method: "POST", headers: { "stripe-signature": sg, "content-type": "application/json" }, body: bd });
  ok((await post(body, "t=1,v1=bad")).status === 400, "webhook Stripe : mauvaise signature → 400");
  const r1 = await post(body, sig); ok(r1.status === 200 && (await r1.json()).result === "applied", "webhook Stripe : événement valide appliqué");
  ok((await sql`select plan from organizations where id = ${sh.id}`)[0].plan === "pro" && (await sql`select customer_id, provider from subscriptions where organization_id = ${sh.id}`)[0].customer_id === "cus_e2e", "plan et abonnement mis à jour depuis Stripe");
  ok((await (await post(body, sig)).json()).result === "duplicate", "webhook Stripe : rejeu idempotent (aucun double traitement)");

  // ── 6. résolution d'agence par nom d'hôte (sous-domaine) : cloisonnement ──
  const sharonOwner = (await sql`select user_id from memberships where organization_id = ${sh.id} and role = 'owner'`)[0].user_id;
  const hostCtx = await b.newContext({ extraHTTPHeaders: { "x-forwarded-host": "sharon.multideploy.test" } }); const hp = await hostCtx.newPage();
  await hostCtx.addCookies([{ name: "dev_user", value: sharonOwner, url: BASE }]);
  await hp.goto(`${BASE}/fr/properties`); ok(hp.url().includes("/fr/properties") && (await hp.locator("tbody tr").count()) === 0, "sous-domaine sharon : le propriétaire de Sharon accède à SON agence (vide)");
  await hostCtx.clearCookies(); await hostCtx.addCookies([{ name: "dev_user", value: yael, url: BASE }]);
  await hp.goto(`${BASE}/fr/properties`); ok(hp.url().includes("/login"), "sous-domaine sharon : un membre d'une AUTRE agence est refusé (pas de fuite)");
  const unknown = await b.newContext({ extraHTTPHeaders: { "x-forwarded-host": "inconnue.multideploy.test" } }); const up = await unknown.newPage(); await unknown.addCookies([{ name: "dev_user", value: yael, url: BASE }]);
  await up.goto(`${BASE}/fr/properties`); ok(up.url().includes("unknown_tenant"), "sous-domaine inconnu : refusé");

  await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 3 : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
