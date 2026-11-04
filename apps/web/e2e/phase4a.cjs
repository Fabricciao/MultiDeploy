// E2E phase 4 (lot A) : API publique, clés, webhooks signés, widget, cron, export, audit, droit à l'effacement.
// Serveur dev avec : CRON_SECRET=cron_e2e BRAND_FETCH_ALLOW_PRIVATE=1 (loopback autorisé pour le récepteur de webhooks)
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const http = require("node:http");
const { createHmac } = require("node:crypto");
const { unzipSync, strFromU8 } = require("fflate");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };
const api = (path, key, init = {}) => fetch(`${BASE}${path}`, { ...init, headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json", ...(init.headers ?? {}) } });

(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const eliezer = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const yael = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id, david = (await sql`select id from profiles where full_name = 'David Mizrahi'`)[0].id;
  const as = async (u) => { await ctx.clearCookies(); await ctx.addCookies([{ name: "dev_user", value: u, url: BASE }]); };

  // ── clés : création (affichée une fois), stockage haché ──
  await as(yael); await p.goto(`${BASE}/fr/settings/integrations`);
  await p.fill('input[name="name"]', "site web"); await p.click('button:has-text("Créer la clé")'); await p.waitForSelector("text=ne sera plus jamais affichée");
  const key = (await p.locator('[data-testid="new-key"]').innerText()).trim();
  const [kr] = await sql`select key_hash, key_prefix from api_keys where organization_id = ${eliezer} and name = 'site web'`;
  ok(/^mdk_[0-9a-f]{48}$/.test(key) && kr.key_hash.length === 64 && !kr.key_hash.includes(key.slice(4, 20)), "clé API générée, seule l'empreinte SHA-256 est stockée");
  await p.reload(); ok((await p.locator("text=ne sera plus jamais affichée").count()) === 0, "la clé n'est plus jamais ré-affichée");

  // ── API : authentification, portées, champs publics, isolation ──
  ok((await api("/api/v1/properties")).status === 401 && (await api("/api/v1/properties", "mdk_" + "0".repeat(48))).status === 401, "sans clé ou clé inconnue : 401");
  const list = await api("/api/v1/properties?limit=5", key); const lj = await list.json();
  ok(list.status === 200 && lj.data.length > 0 && lj.data.length <= 5, `GET /properties : ${lj.data?.length} biens`);
  const row = lj.data[0];
  ok(!("internal_notes" in row) && !("agent_id" in row) && !("organization_id" in row) && /^[0-9a-f]{24}$/.test(row.id), "champs publics uniquement : pas de notes internes, d'agent ni d'identifiant interne");
  ok((await (await api(`/api/v1/properties/${row.id}`, key)).json()).data.id === row.id, "GET /properties/:id");
  ok((await api("/api/v1/properties/" + "a".repeat(24), key)).status === 404, "bien inconnu : 404");
  const draftCount = (await sql`select count(*)::int n from properties where organization_id = ${eliezer} and status <> 'active'`)[0].n;
  const all = await (await api("/api/v1/properties?limit=50", key)).json();
  ok(draftCount > 0 && all.data.length === (await sql`select count(*)::int n from properties where organization_id = ${eliezer} and status = 'active' and deleted_at is null and public_token is not null`)[0].n, "seuls les biens ACTIFS sont exposés (brouillons/vendus exclus)");
  // portée leads seule
  await sql`insert into api_keys (organization_id, name, key_prefix, key_hash, scopes) values (${eliezer}, 'leads only', 'mdk_x', ${createHmac("sha256", "x").update("y").digest("hex")}, '{leads:write}')`;
  const leadsKey = "mdk_" + "b".repeat(48); await sql`update api_keys set key_hash = encode(extensions.digest(${leadsKey}, 'sha256'), 'hex') where name = 'leads only'`;
  ok((await api("/api/v1/properties", leadsKey)).status === 403, "clé sans la portée properties:read : 403");

  // ── leads : création, validation, dédoublonnage, consentement ──
  const l1 = await api("/api/v1/leads", leadsKey, { method: "POST", body: JSON.stringify({ first_name: "Noa", phone: "054-900-1122", email: "noa@example.test", message: "Intéressée par le 4 pièces", locale: "he", consent: true }) });
  const j1 = await l1.json(); ok(l1.status === 201 && j1.duplicate === false, "POST /leads : lead créé (201)");
  const [c1] = await sql`select phone_primary_e164 ph, marketing_consent->>'granted' g, preferred_locale l, source_id from contacts where id = ${j1.id}`;
  ok(c1.ph === "+972549001122" && c1.g === "true" && c1.l === "he" && c1.source_id, "téléphone normalisé, consentement explicite, langue, source « Site web »");
  const l2 = await api("/api/v1/leads", leadsKey, { method: "POST", body: JSON.stringify({ phone: "0549001122", message: "relance" }) }); const j2 = await l2.json();
  ok(l2.status === 200 && j2.duplicate && j2.id === j1.id && (await sql`select count(*)::int n from contacts where phone_primary_e164 = '+972549001122'`)[0].n === 1, "même téléphone : pas de doublon, message rattaché à la fiche");
  const l3 = await api("/api/v1/leads", leadsKey, { method: "POST", body: JSON.stringify({ first_name: "X" }) }); ok(l3.status === 422, "lead sans téléphone ni e-mail : 422");
  const l4 = await api("/api/v1/leads", leadsKey, { method: "POST", body: JSON.stringify({ phone: "abc" }) }); ok(l4.status === 422, "téléphone invalide : 422");
  ok((await api("/api/v1/leads", leadsKey, { method: "POST", body: "x".repeat(20000) })).status === 413, "corps trop gros : 413");
  ok((await sql`select marketing_consent->>'granted' g from contacts where id = ${(await (await api("/api/v1/leads", leadsKey, { method: "POST", body: JSON.stringify({ email: "no-consent@example.test" }) })).json()).id}`)[0].g === "false", "sans consentement explicite : consentement = faux (jamais présumé)");

  // ── révocation et fonctionnalité de plan ──
  await as(yael); await p.goto(`${BASE}/fr/settings/integrations`); await p.locator("form", { hasText: "site web" }).locator('button:has-text("Révoquer")').click(); await p.waitForTimeout(800);
  ok((await api("/api/v1/properties", key)).status === 401, "clé révoquée : 401 immédiat");
  await sql`update organizations set plan = 'starter' where id = ${eliezer}`; ok((await api("/api/v1/properties", leadsKey)).status === 401, "plan sans option API : clés inopérantes");
  await p.goto(`${BASE}/fr/settings/integrations`); ok(await p.locator("text=pas incluse dans votre plan").isVisible(), "page Intégrations : message de plan"); await sql`update organizations set plan = 'pro' where id = ${eliezer}`;
  await as(david); await p.goto(`${BASE}/fr/settings/integrations`); ok(await p.locator("text=Réservé aux administrateurs").isVisible(), "un agent n'accède pas aux intégrations");

  // ── rate limit ──
  let limited = 0; for (let i = 0; i < 40; i++) { const r = await api("/api/v1/properties", "mdk_" + "c".repeat(48)); if (r.status === 429) limited++; }
  ok(limited > 0, "clés invalides répétées : limitation de débit (429)");

  // ── webhooks : récepteur local, signature, reprise ──
  const received = []; let failNext = true;
  const hook = http.createServer((q, r) => { let d = ""; q.on("data", (c) => (d += c)); q.on("end", () => { received.push({ sig: q.headers["x-multideploy-signature"], ev: q.headers["x-multideploy-event"], body: d }); if (failNext) { failNext = false; r.statusCode = 500; } r.end("ok"); }); });
  await new Promise((r) => hook.listen(0, "127.0.0.1", r)); const hurl = `http://127.0.0.1:${hook.address().port}/in`;
  await as(yael); await p.goto(`${BASE}/fr/settings/integrations`); await p.fill('input[name="url"]', hurl); await p.click('button:has-text("Ajouter le webhook")'); await p.waitForSelector("text=commencer par https");
  ok(true, "webhook : URL non-HTTPS refusée par l'interface");
  await sql`insert into webhook_endpoints (organization_id, url, events, secret) values (${eliezer}, ${hurl}, '{contact.created}', 'whsec_test_hook')`;
  await sql`insert into contacts (organization_id, first_name) values (${eliezer}, 'HookTest')`;
  ok((await sql`select count(*)::int n from webhook_deliveries d join webhook_endpoints e on e.id = d.endpoint_id where e.secret = 'whsec_test_hook'`)[0].n === 1, "création de contact : livraison de webhook en file");
  const cron = (path, tok) => fetch(`${BASE}${path}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
  ok((await cron("/api/cron/webhooks")).status === 401 && (await cron("/api/cron/webhooks", "wrong")).status === 401 && (await cron("/api/cron/daily", "wrong")).status === 401, "cron : refusé sans le bon secret");
  const r1 = await (await cron("/api/cron/webhooks", "cron_e2e")).json();
  ok(received.length === 1 && r1.retried === 1, "1re livraison (récepteur en erreur 500) → programmée pour reprise");
  const sg = received[0].sig, ts = /t=(\d+)/.exec(sg)[1];
  ok(sg === `t=${ts},v1=${createHmac("sha256", "whsec_test_hook").update(`${ts}.${received[0].body}`).digest("hex")}` && received[0].ev === "contact.created" && JSON.parse(received[0].body).type === "contact.created", "signature HMAC valide et corps conforme");
  await sql`update webhook_deliveries set next_attempt_at = now() - interval '1 second'`;
  const r2 = await (await cron("/api/cron/webhooks", "cron_e2e")).json();
  ok(received.length === 2 && r2.delivered === 1 && (await sql`select attempts, status from webhook_deliveries order by id desc limit 1`)[0].status === "delivered", "reprise réussie (2 tentatives) → livré");
  hook.close();
  const d = await (await cron("/api/cron/daily", "cron_e2e")).json(); ok("monthly_grants" in d && "purged" in d, "cron quotidien : crédits mensuels, purge, webhooks");

  // ── widget intégrable + formulaire (pot de miel, limitation) ──
  const ew = await b.newContext(); const ep = await ew.newPage(); const res = await ep.goto(`${BASE}/fr/embed/eliezer`);
  ok(res.status() === 200 && (await ep.locator("article").count()) > 0 && !(res.headers()["x-frame-options"]), "widget public : biens publiés, iframe autorisée (pas de X-Frame-Options)");
  const before = (await sql`select count(*)::int n from contacts where organization_id = ${eliezer}`)[0].n;
  await ep.fill('input[name="name"]', "Bot"); await ep.evaluate(() => { document.querySelector('input[name="website"]').value = "spam"; }); await ep.fill('input[name="phone"]', "0501119999"); await ep.click('button:has-text("Envoyer")'); await ep.waitForSelector("text=Merci");
  ok((await sql`select count(*)::int n from contacts where organization_id = ${eliezer}`)[0].n === before, "pot de miel : le robot est ignoré silencieusement");
  await ep.fill('input[name="name"]', "Visiteur"); await ep.fill('input[name="phone"]', "0503334455"); await ep.fill('textarea[name="message"]', "Je veux visiter"); await ep.click('button:has-text("Envoyer")'); await ep.waitForTimeout(2000);
  ok((await sql`select count(*)::int n from contacts where phone_primary_e164 = '+972503334455'`)[0].n === 1, "formulaire du widget : lead créé");
  ok((await ep.goto(`${BASE}/fr/embed/inconnue`)).status() === 404, "widget d'une agence inconnue : 404");
  await ew.close();

  // ── export, audit, droit d'accès / effacement ──
  await as(yael);
  const z = await ctx.request.get(`${BASE}/api/export`); const files = unzipSync(new Uint8Array(await z.body()));
  ok(z.status() === 200 && files["contacts.csv"] && files["properties.csv"] && files["contacts.csv"][0] === 0xef && files["contacts.csv"][1] === 0xbb, "export ZIP : CSV UTF-8 (BOM) des biens, clients, affaires…");
  await as(david); ok((await ctx.request.get(`${BASE}/api/export`)).status() === 403, "export refusé à un agent");
  await as(yael); await p.goto(`${BASE}/fr/settings/audit`); ok((await p.locator("tbody tr").count()) > 0, "journal d'audit : entrées listées");
  const victim = (await sql`select id from contacts where first_name = 'Visiteur'`)[0].id;
  const ex = await ctx.request.get(`${BASE}/api/export/contact/${victim}`); const exj = await ex.json(); ok(ex.status() === 200 && exj.contact.first_name === "Visiteur", "droit d'accès : export JSON d'un contact");
  await p.goto(`${BASE}/fr/clients/${victim}`); await p.check('input[name="confirm"]'); await p.click('button:has-text("Effacer les données personnelles")'); await p.waitForURL(/\/fr\/clients$/);
  const [er] = await sql`select first_name, phones, do_not_contact, notes from contacts where id = ${victim}`;
  ok(er.first_name === null && JSON.stringify(er.phones) === "[]" && er.do_not_contact, "droit à l'effacement : données personnelles anonymisées");
  await sql`insert into role_capabilities (organization_id, role, capability, granted) values (${eliezer}, 'agent', 'contacts.read_all', false)`;
  await as(david); ok((await ctx.request.get(`${BASE}/api/export/contact/${(await sql`select id from contacts where owner_id = ${yael} limit 1`)[0].id}`)).status() === 404, "export d'un contact invisible pour l'agent (visibilité restreinte) : 404");
  await sql`delete from role_capabilities where organization_id = ${eliezer} and capability = 'contacts.read_all'`;

  await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 4A : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
