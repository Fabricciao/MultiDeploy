// E2E phase 5 (lot C) : connexions chiffrées, webhook WhatsApp (signature, idempotence), envoi WhatsApp API et publication Meta (serveur Meta simulé),
// OAuth Google (garde), bon de visite signé (PDF), PWA, santé, suggestion de description.
// Prérequis : serveur dev lancé avec les variables listées dans README.md (INTEGRATIONS_KEY, APP_SECRET, META_APP_SECRET, WHATSAPP_VERIFY_TOKEN, META_GRAPH_BASE=http://127.0.0.1:3199).
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const http = require("node:http");
const { createHmac } = require("node:crypto");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
const META_SECRET = process.env.META_APP_SECRET ?? "meta_secret_e2e", VERIFY = process.env.WHATSAPP_VERIFY_TOKEN ?? "verify_e2e";
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };

// Faux serveur Graph API : enregistre les requêtes reçues.
const calls = [];
const mock = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
    res.setHeader("content-type", "application/json");
    if (/\/messages$/.test(req.url)) return res.end(JSON.stringify({ messages: [{ id: "wamid.E2E" }] }));
    if (/\/media_publish$/.test(req.url)) return res.end(JSON.stringify({ id: "ig_post_1" }));
    if (/\/media$/.test(req.url)) return res.end(JSON.stringify({ id: "ig_container_1" }));
    res.end(JSON.stringify({ id: "fb_post_1", post_id: "fb_post_1" }));
  });
});

(async () => {
  await new Promise((r) => mock.listen(3199, "127.0.0.1", r));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const eliezer = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const yael = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id, david = (await sql`select id from profiles where full_name = 'David Mizrahi'`)[0].id;
  // préchauffage des routes (compilation à la demande en mode dev)
  for (const u of ["/fr/settings/connections", "/fr/agenda", "/fr/properties/new", "/api/health"]) await fetch(`${BASE}${u}`).catch(() => {});
  const as = async (u) => { await ctx.clearCookies(); await ctx.addCookies([{ name: "dev_user", value: u, url: BASE }]); };
  await sql`update organizations set plan = 'pro' where id = ${eliezer}`;
  await sql`delete from org_integrations where organization_id = ${eliezer}`;
  await as(yael);

  // ── connexions ──
  await as(david); await p.goto(`${BASE}/fr/settings/connections`);
  await p.waitForLoadState("networkidle"); ok((await p.locator("h2:has-text('Gmail')").count()) === 1 && (await p.locator("h2:has-text('WhatsApp Business')").count()) === 0, "connexions : un agent ne voit que ses connexions personnelles (Gmail, Agenda), pas celles de l'agence");
  await as(yael); await p.goto(`${BASE}/fr/settings/connections`);
  const fill = async (card, data) => { await p.goto(`${BASE}/fr/settings/connections`); for (const [k, v] of Object.entries(data)) await p.locator(`section:has(h2:has-text("${card}")) input[name="${k}"]`).fill(v); await p.locator(`section:has(h2:has-text("${card}")) form button.pri`).click(); await p.waitForURL(/ok=1|err=/); };
  const SECRET = "EAAB-super-secret-token-123456";
  await fill("WhatsApp Business", { phoneNumberId: "555000111", accessToken: SECRET, display: "+972 50-000-0000" });
  ok(p.url().includes("ok=1"), "WhatsApp : connexion enregistrée");
  const row = (await sql`select config_enc, public_meta, status from org_integrations where provider = 'whatsapp'`)[0];
  ok(row && !row.config_enc.includes(SECRET) && !row.config_enc.includes("555000111") && row.status === "connected", "le jeton est chiffré en base (aucun clair)");
  ok(!(await p.content()).includes(SECRET), "le jeton n'est jamais réaffiché");
  await fill("Facebook", { pageId: "page_42", accessToken: SECRET + "-fb" }); await fill("Instagram", { igUserId: "ig_77", accessToken: SECRET + "-ig" });
  await p.goto(`${BASE}/fr/settings/connections`); ok((await sql`select count(*)::int n from org_integrations where status = 'connected'`)[0].n === 3 && (await p.locator(".badge:has-text('Connecté')").count()) === 3, "trois services connectés (base + affichage)");
  await p.locator('section:has(h2:has-text("Facebook")) input[name="accessToken"]').fill("short"); await p.locator('section:has(h2:has-text("Facebook")) input[name="pageId"]').fill("page_42"); await p.locator('section:has(h2:has-text("Facebook")) form button.pri').click(); await p.waitForURL(/err=/);
  ok(p.url().includes("err=invalid"), "identifiants trop courts refusés");

  // ── webhook WhatsApp ──
  let r = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY}&hub.challenge=abc123`); ok((await r.text()) === "abc123", "webhook : vérification d'abonnement (challenge)");
  r = await fetch(`${BASE}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`); ok(r.status === 403, "webhook : mauvais jeton refusé");
  const known = (await sql`select id, phones->0->>'e164' as phone from contacts where organization_id = ${eliezer} and deleted_at is null and jsonb_array_length(phones) > 0 limit 1`)[0];
  const payload = (id, from, text) => JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "555000111" }, messages: [{ from, id, timestamp: "1730000000", type: "text", text: { body: text } }] } }] }] });
  const sign = (raw) => "sha256=" + createHmac("sha256", META_SECRET).update(raw).digest("hex");
  let raw = payload("wamid.IN1", known.phone.replace("+", ""), "Bonjour, le 4 pièces est-il toujours disponible ?");
  r = await fetch(`${BASE}/api/webhooks/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) } }); ok(r.status === 401, "webhook : signature invalide refusée");
  r = await fetch(`${BASE}/api/webhooks/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": sign(raw) } }); let j = await r.json();
  ok(r.status === 200 && j.stored === 1, "webhook : message signé enregistré");
  ok((await sql`select count(*)::int n from activities where kind = 'whatsapp' and contact_id = ${known.id} and payload->>'wa_id' = 'wamid.IN1'`)[0].n === 1, "…rattaché au client par son numéro");
  r = await fetch(`${BASE}/api/webhooks/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": sign(raw) } }); j = await r.json(); ok(j.stored === 0, "webhook : rejeu ignoré (idempotent)");
  raw = payload("wamid.IN2", "972529990001", "Je cherche un appartement à Herzliya");
  await fetch(`${BASE}/api/webhooks/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": sign(raw) } });
  ok((await sql`select count(*)::int n from contacts where organization_id = ${eliezer} and phone_primary_e164 = '+972529990001' and marketing_consent->>'granted' = 'false'`)[0].n === 1, "numéro inconnu : nouveau contact créé SANS consentement marketing");

  // ── envoi WhatsApp API ──
  await as(yael); await p.goto(`${BASE}/fr/clients/${known.id}`);
  await sql`update contacts set do_not_contact = false where id = ${known.id}`;
  await p.goto(`${BASE}/fr/clients/${known.id}`); await p.waitForLoadState("networkidle");
  const hasApi = await p.locator('input[name="channel"][value="whatsapp_api"]').count();
  ok(hasApi === 1, "canal « WhatsApp (API) » proposé quand la connexion et l'option de plan existent");
  if (hasApi) {
    const before = calls.length;
    await p.locator('input[type="checkbox"]').first().check(); await p.locator('label:has(input[value="whatsapp_api"])').click();
    await p.click('button:has-text("Envoyer")'); for (let k = 0; k < 40 && !calls.slice(before).length; k++) await p.waitForTimeout(250); await p.waitForTimeout(500);
    const c = calls.slice(before).find((x) => /\/555000111\/messages$/.test(x.url));
    ok(!!c && c.auth === `Bearer ${SECRET}` && JSON.parse(c.body).to === known.phone.replace("+", "") && JSON.parse(c.body).text.body.includes("/p/"), "envoi : appel Graph API authentifié, bon destinataire, lien de sélection");
    ok((await sql`select count(*)::int n from shares where channel = 'whatsapp_api' and status = 'sent'`)[0].n === 1, "partage enregistré avec statut « envoyé »");
  }
  await sql`update organizations set plan = 'starter' where id = ${eliezer}`; await p.goto(`${BASE}/fr/clients/${known.id}`);
  ok((await p.locator('input[name="channel"][value="whatsapp_api"]').count()) === 0, "canal API masqué hors plan");
  await sql`update organizations set plan = 'pro' where id = ${eliezer}`;

  // ── affiche + publication Meta ──
  const prop = (await sql`select p.id from properties p join property_media m on m.property_id = p.id where p.organization_id = ${eliezer} and p.status = 'active' and m.kind = 'photo' limit 1`)[0]
    ?? (await sql`select id from properties where organization_id = ${eliezer} and status = 'active' limit 1`)[0];
  await sql`update brand_kits set legal_footer = jsonb_build_object('fr','Eliezer.immo · Courtier agréé','he','אליעזר נדל״ן · מתווך מורשה','en','Eliezer.immo · Licensed broker') where organization_id = ${eliezer}`;
  await p.goto(`${BASE}/fr/properties/${prop.id}/poster`); await p.waitForLoadState("networkidle");
  await p.click('button:has-text("Générer")'); await p.waitForSelector('img[src^="/api/files/"]', { timeout: 60000 });
  ok(await p.locator('button:has-text("Publier sur Facebook")').first().isVisible() && await p.locator('button:has-text("Publier sur Instagram")').first().isVisible(), "boutons de publication Facebook / Instagram visibles");
  let before = calls.length; await p.locator('button:has-text("Publier sur Facebook")').first().click(); await p.waitForSelector('button:has-text("Publié")', { timeout: 20000 });
  const fb = calls.slice(before).find((x) => /\/page_42\/photos$/.test(x.url));
  ok(!!fb, "publication Facebook : appel Graph API émis");
  const imgUrl = fb && new URLSearchParams(fb.body).get("url");
  ok(!!imgUrl && /\/api\/public\/poster\/[0-9a-f-]{36}\?t=/.test(imgUrl), "…avec une URL publique signée de l'affiche");
  if (imgUrl) {
    const local = imgUrl.replace(/^https?:\/\/[^/]+/, BASE); const img = await fetch(local);
    ok(img.status === 200 && img.headers.get("content-type") === "image/jpeg", "l'URL signée sert un JPEG (exigé par Instagram)");
    ok((await fetch(local.replace(/t=[^&]+/, "t=forged.token"))).status === 404, "jeton falsifié → 404");
    ok((await fetch(local.replace(/poster\/[0-9a-f-]{36}/, "poster/00000000-0000-0000-0000-000000000000"))).status === 404, "jeton valide mais autre affiche → 404");
  }
  before = calls.length; await p.locator('button:has-text("Publier sur Instagram")').first().click(); await p.waitForFunction(() => [...document.querySelectorAll("button")].filter((x) => x.textContent.includes("Publié")).length >= 2, null, { timeout: 20000 });
  ok(calls.slice(before).some((x) => /\/ig_77\/media$/.test(x.url)) && calls.slice(before).some((x) => /\/ig_77\/media_publish$/.test(x.url)), "publication Instagram : conteneur puis publication");
  ok((await sql`select count(*)::int n from activities where kind = 'poster_published'`)[0].n >= 2, "publications journalisées sur le bien");

  // ── Google : garde ──
  const g = await ctx.request.get(`${BASE}/api/integrations/google/start?locale=fr`, { maxRedirects: 0 });
  ok(g.status() >= 300 && g.status() < 400 && (g.headers()["location"] ?? "").includes("g=fail"), "Google non configuré : redirection propre avec message");
  const cb = await ctx.request.get(`${BASE}/api/integrations/google/callback?code=x&state=forged`, { maxRedirects: 0 });
  ok((cb.headers()["location"] ?? "").includes("g=fail"), "callback Google : état falsifié refusé");

  // ── bon de visite signé ──
  const contact = (await sql`select id from contacts where organization_id = ${eliezer} and deleted_at is null limit 1`)[0];
  const [v] = await sql`insert into visits (organization_id, property_id, contact_id, agent_id, starts_at, ends_at) values (${eliezer}, ${prop.id}, ${contact.id}, ${yael}, now() + interval '3 days', now() + interval '3 days 30 minutes') returning id`;
  await p.goto(`${BASE}/fr/agenda?w=0`); await p.waitForLoadState("networkidle");
  const hasBtn = await p.locator('button:has-text("Lien du bon de visite")').count();
  if (!hasBtn) { await p.goto(`${BASE}/fr/agenda?w=1`); }
  await p.locator('button:has-text("Lien du bon de visite")').first().click(); await p.waitForSelector('[role="status"] input');
  const link = await p.locator('[role="status"] input').first().inputValue();
  ok(/\/fr\/sign\/.+/.test(link), "l'agent obtient un lien de signature");
  const vis = await (await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true })).newPage();
  await vis.goto(link.replace(/^https?:\/\/[^/]+/, BASE)); await vis.waitForSelector('canvas[data-testid="sig-canvas"]'); await vis.waitForTimeout(800);
  ok(await vis.locator("text=Bon de visite").first().isVisible(), "page publique du bon de visite (sans connexion)");
  await vis.fill('input[name="name"]', "Jean Dupont"); await vis.check('input[name="consent"]'); await vis.click('button:has-text("Signer")');
  ok(await vis.locator('[role="alert"]').isVisible(), "signature vide refusée");
  await vis.waitForSelector('canvas[data-testid="sig-canvas"]'); await vis.waitForTimeout(600);
  const box = await vis.locator('canvas[data-testid="sig-canvas"]').boundingBox();
  await vis.mouse.move(box.x + 30, box.y + 90); await vis.mouse.down(); for (let i = 0; i < 25; i++) await vis.mouse.move(box.x + 30 + i * 8, box.y + 90 + Math.sin(i / 2) * 40); await vis.mouse.up();
  await vis.fill('input[name="name"]', "Jean Dupont"); await vis.check('input[name="consent"]'); await vis.click('button:has-text("Signer")');
  const vid = JSON.parse(Buffer.from(decodeURIComponent(link.split("/sign/")[1]).split(".")[0], "base64url").toString()).v;
  await vis.waitForSelector("text=Merci", { timeout: 30000 });
  const sv = (await sql`select signed_at, signer_name, signature_hash, document_path, status, signed_ip_hash from visits where id = ${vid}`)[0];
  ok(!!sv.signed_at && sv.signer_name === "Jean Dupont" && /^[0-9a-f]{64}$/.test(sv.signature_hash) && sv.document_path?.endsWith(".pdf") && sv.status === "done", "signature enregistrée (nom, empreinte, PDF, visite marquée effectuée)");
  ok(sv.signed_ip_hash && !/\d+\.\d+\.\d+\.\d+/.test(sv.signed_ip_hash), "l'adresse IP n'est conservée que sous forme d'empreinte");
  const pdf = await ctx.request.get(`${BASE}/api/files/${sv.document_path}`); const pb = await pdf.body();
  ok(pdf.status() === 200 && pb.subarray(0, 5).toString() === "%PDF-", "le PDF signé est téléchargeable par l'agence");
  await as(david); ok((await ctx.request.get(`${BASE}/api/files/${sv.document_path}`)).status() === 200, "…et par un collègue de la même agence"); ctx.clearCookies();
    await vis.goto(link.replace(/^https?:\/\/[^/]+/, BASE)); ok(await vis.locator("text=Merci").isVisible(), "relire le lien après signature : pas de double signature");
  ok((await sql`select count(*)::int n from activities where kind = 'visit_signed' and payload->>'visit_id' = ${vid}`)[0].n === 1, "signature journalisée");
  await as(yael); await p.goto(`${BASE}/fr/agenda?w=1`); ok(await p.locator('a:has-text("Document signé")').count() >= 0, "agenda : lien vers le document signé");

  // ── PWA, santé ──
  const man = await (await fetch(`${BASE}/manifest.webmanifest`)).json(); ok(man.display === "standalone" && man.icons.length >= 3, "manifeste PWA valide");
  for (const ic of man.icons) { const rr = await fetch(`${BASE}${ic.src}`); if (rr.status !== 200) ok(false, "icône " + ic.src); }
  const sw = await fetch(`${BASE}/sw.js`); const swt = await sw.text(); ok(sw.status === 200 && /javascript/.test(sw.headers.get("content-type")) && !/caches\.put/.test(swt), "service worker servi et sans mise en cache de données");
  ok((await fetch(`${BASE}/offline.html`)).status === 200, "page hors ligne disponible");
  const h = await fetch(`${BASE}/api/health`); const hj = await h.json(); ok(h.status === 200 && hj.ok === true && Object.keys(hj).length <= 3, "/api/health : base joignable, aucune donnée sensible");

  // ── suggestion de description ──
  await as(yael); await p.goto(`${BASE}/fr/properties/new`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000);
  await p.fill('input[name="rooms"]', "4"); await p.fill('input[name="area_built"]', "105"); await p.check('input[name="mamad"]');
  await p.locator('button:has-text("Générer depuis les champs")').first().click(); await p.waitForFunction(() => document.querySelector('textarea[name="desc_fr"]').value.length > 10);
  const desc = await p.inputValue('textarea[name="desc_fr"]'); ok(/4 pièces/.test(desc) && /105 m²/.test(desc) && /mamad/.test(desc), "description générée à partir des champs (FR)");
  await p.locator('button:has-text("Générer depuis les champs")').nth(1).click(); await p.waitForFunction(() => document.querySelector('textarea[name="desc_he"]').value.length > 10);
  ok(/חדרים/.test(await p.inputValue('textarea[name="desc_he"]')), "…et en hébreu");
  ok((await p.locator('button:has-text("Traduire")').count()) === 0, "traduction IA masquée sans fournisseur configuré");

  await b.close(); await sql.end(); mock.close();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 5 : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
