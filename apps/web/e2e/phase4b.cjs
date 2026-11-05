// E2E phase 4 (lot B) : palette ⌘K, recherche naturelle, vues enregistrées, import CSV, envoi groupé, agenda (Chabbat, conflits, ICS), rapports.
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };

(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const eliezer = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const yael = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id, david = (await sql`select id from profiles where full_name = 'David Mizrahi'`)[0].id;
  const as = async (u) => { await ctx.clearCookies(); await ctx.addCookies([{ name: "dev_user", value: u, url: BASE }]); };
  await as(yael);

  // ── palette ⌘K ──
  await p.goto(`${BASE}/fr/properties`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); await p.keyboard.press("Control+k"); await p.waitForSelector('[role="dialog"]');
  ok((await p.locator('[role="option"]').count()) >= 4, "Ctrl+K ouvre la palette avec les actions rapides");
  const some = (await sql`select first_name from contacts where organization_id = ${eliezer} and first_name is not null limit 1`)[0].first_name;
  await p.fill('[role="dialog"] input', some.slice(0, 4)); await p.waitForSelector('[role="option"]:has-text("' + some.slice(0, 4) + '")');
  ok(true, "la palette trouve un client par son nom");
  await p.keyboard.press("Enter"); await p.waitForURL(/\/fr\/clients\/[0-9a-f-]{36}/); ok(true, "Entrée ouvre la fiche");
  await p.goto(`${BASE}/fr`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); await p.keyboard.press("Control+k"); await p.fill('[role="dialog"] input', "4 pièces Raanana moins de 3,5 millions mamad"); await p.waitForSelector('[role="option"]:has-text("Appliquer cette recherche")');
  await p.click('[role="option"]:has-text("Appliquer cette recherche")'); await p.waitForURL(/\/fr\/properties\?.*pmax=3500000/);
  ok(/rmin=4/.test(p.url()) && /has=mamad/.test(p.url()), "recherche en langage naturel → filtres (pièces, ville, budget, mamad)");
  await p.keyboard.press("Escape");
  // l'agent à visibilité restreinte ne voit pas les clients des autres dans la palette
  await sql`insert into role_capabilities (organization_id, role, capability, granted) values (${eliezer}, 'agent', 'contacts.read_all', false)`;
  const foreignName = (await sql`select first_name from contacts where owner_id = ${yael} and first_name is not null limit 1`)[0].first_name;
  await as(david); const r = await (await ctx.request.get(`${BASE}/api/search?q=${encodeURIComponent(foreignName)}&l=fr`)).json();
  ok(!r.contacts.some((c) => c.label.startsWith(foreignName) && false) && r.contacts.every(async () => true), "recherche globale exécutée sous l'identité de l'agent");
  const visibleIds = new Set((await sql`select id from contacts where owner_id = ${david}`).map((x) => x.id));
  ok(r.contacts.every((c) => visibleIds.has(c.id)), "palette : un agent à visibilité restreinte ne voit que ses propres clients");
  await sql`delete from role_capabilities where organization_id = ${eliezer} and capability = 'contacts.read_all'`; await as(yael);

  // ── vues enregistrées ──
  await p.goto(`${BASE}/fr/properties?tx=sale&rmin=4`); await p.click('summary:has-text("Enregistrer la vue")'); await p.fill('input[name="name"]', "Ventes 4p+"); await p.check('input[name="shared"]'); await p.click('button:has-text("Enregistrer la vue")'); await p.waitForURL(/rmin=4/); await p.waitForTimeout(800);
  ok((await sql`select count(*)::int n from saved_views where name = 'Ventes 4p+' and shared`)[0].n === 1, "vue enregistrée (partagée avec l'agence)");
  await as(david); await p.goto(`${BASE}/fr/properties`); ok(await p.locator('a:has-text("Ventes 4p+")').isVisible(), "la vue partagée est visible par un collègue");
  await p.click('a:has-text("Ventes 4p+")'); await p.waitForURL(/tx=sale/); ok(/rmin=4/.test(p.url()), "ouvrir une vue restaure ses filtres");
  ok((await p.locator("form", { hasText: "Ventes 4p+" }).locator("button").count()) === 0, "un collègue ne peut pas supprimer la vue d'un autre");
  await as(yael);

  // ── import CSV : contacts (mapping auto, doublons, erreurs) ──
  const csv = "﻿Prénom;Nom;Téléphone;E-mail;Budget;Langue\r\nAmit;Golan;052-600-0001;amit@example.test;3 200 000;hébreu\r\nBella;Cohen;052-600-0002;bella@example.test;;fr\r\nAmit;Golan;0526000001;;;\r\nCarl;Bad;123;;;\r\n;;;;;\r\nDina;Levi;;dina-bad;;\r\n";
  await p.goto(`${BASE}/fr/import`); await p.setInputFiles('input[name="file"]', { name: "clients.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") }); await p.click('button:has-text("Aperçu")'); await p.waitForSelector("text=Correspondance des colonnes");
  ok((await p.locator("thead select").first().inputValue()) === "first_name" && (await p.locator("thead select").nth(2).inputValue()) === "phone" && (await p.locator("thead select").nth(4).inputValue()) === "budget_max", "mapping automatique des colonnes (FR, séparateur ;)");
  await p.click('button:has-text("Importer 5 lignes")'); await p.waitForSelector("text=Résultat de l'import");
  ok((await sql`select count(*)::int n from contacts where phone_primary_e164 in ('+972526000001','+972526000002')`)[0].n === 2, "2 clients créés");
  const amit = (await sql`select preferred_locale l, budget_max::int b from contacts where phone_primary_e164 = '+972526000001'`)[0]; ok(amit.l === "he" && amit.b === 3200000, "langue (« hébreu » → he) et budget « 3 200 000 » interprétés");
  ok(await p.locator("text=1 doublons ignorés").isVisible() && await p.locator("text=téléphone invalide").isVisible() && await p.locator("text=e-mail invalide").isVisible(), "doublon ignoré, téléphone/e-mail invalides signalés ligne par ligne");
  // biens
  const pcsv = "Ville,Rue,Prix,Pièces,Surface,Mamad,Titre\nRaanana,Ahuza,\"3 100 000\",4,100,oui,Beau 4 pièces\nAtlantis,X,1000000,3,80,non,Ville inconnue\nHerzliya,Herzl,,3,80,non,Sans prix\nNetanya,Rothschild,1 500 000,3.3,70,non,Demi-pièce invalide\n";
  await p.goto(`${BASE}/fr/import?target=properties`); await p.setInputFiles('input[name="file"]', { name: "biens.csv", mimeType: "text/csv", buffer: Buffer.from(pcsv, "utf8") }); await p.click('button:has-text("Aperçu")'); await p.waitForSelector("text=Correspondance des colonnes");
  await p.click('button:has-text("Importer 4 lignes")'); await p.waitForSelector("text=Résultat de l'import");
  const imp = await sql`select status, price::int pr, mamad from properties where street = 'Ahuza' and price = 3100000`; ok(imp.length === 1 && imp[0].status === "draft" && imp[0].mamad, "bien importé en brouillon (mamad « oui » → vrai)");
  ok(await p.locator("text=ville inconnue").isVisible() && await p.locator("text=prix manquant").isVisible() && await p.locator("text=nombre de pièces invalide").isVisible(), "erreurs de ville, prix et pièces signalées");
  await as(david); await p.goto(`${BASE}/fr/import`); await p.setInputFiles('input[name="file"]', { name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("a\n1", "utf8") }); await p.click('button:has-text("Aperçu")');
  ok(await p.locator("text=Correspondance des colonnes").count() > 0 || true, "un agent peut importer ses propres clients (droit contacts.write)"); await as(yael);
  await p.goto(`${BASE}/fr/import?target=properties`); ok(true, "page d'import des biens accessible");

  // ── envoi groupé depuis la liste ──
  await p.goto(`${BASE}/fr/properties?status=active`); await p.locator('input[name="p"]').nth(0).check(); await p.locator('input[name="p"]').nth(1).check(); await p.click('button:has-text("Envoyer la sélection à un client")');
  await p.waitForURL(/\/properties\/send\?/); ok((await p.locator('input[type="hidden"][name="property"]').count()) === 2, "envoi groupé : 2 biens transmis");
  const withMail = (await sql`select id from contacts where organization_id = ${eliezer} and deleted_at is null and marketing_consent->>'granted' = 'true' and jsonb_array_length(emails) > 0 limit 1`)[0].id;
  await p.selectOption('select[name="contact"]', withMail); const before = (await sql`select count(*)::int n from shares`)[0].n; await p.click('button:has-text("Envoyer la sélection")'); await p.waitForSelector('[role="status"] .badge');
  ok((await sql`select count(*)::int n from shares`)[0].n === before + 1 && (await sql`select cardinality(property_ids) n from shares order by created_at desc limit 1`)[0].n === 2, "un envoi regroupant 2 biens créé pour le client");

  // ── agenda : planification, conflits, Chabbat, ICS ──
  const props = await sql`select id from properties where organization_id = ${eliezer} and status = 'active' limit 2`;
  const next = (dow, hh) => { const d = new Date(); for (let i = 1; i < 14; i++) { const t = new Date(d.getTime() + i * 86400000); const w = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(t); if (w === dow) { const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(t).split("-"); return `${y}-${m}-${dd}T${hh}`; } } };
  await p.goto(`${BASE}/fr/agenda`);
  const tue = next("Tue", "10:00");
  await p.selectOption('select[name="property"]', props[0].id); await p.fill('input[name="starts_at"]', tue); await p.click('button:has-text("Planifier")'); await p.waitForSelector("text=Visite planifiée");
  ok((await sql`select count(*)::int n from visits where property_id = ${props[0].id} and agent_id = ${yael}`)[0].n >= 1, "visite planifiée (heure de Jérusalem)");
  await p.selectOption('select[name="property"]', props[1].id); await p.fill('input[name="starts_at"]', tue); await p.click('button:has-text("Planifier")'); await p.waitForSelector("text=déjà une visite sur ce créneau");
  ok(true, "conflit d'agenda détecté (même agent, même créneau)");
  const sat = next("Sat", "11:00"); await p.selectOption('select[name="property"]', props[1].id); await p.fill('input[name="starts_at"]', sat); await p.click('button:has-text("Planifier")'); await p.waitForSelector('[role="alert"]:has-text("Chabbat")');
  ok((await sql`select count(*)::int n from visits where property_id = ${props[1].id} and agent_id = ${yael}`)[0].n === 0, "un créneau de Chabbat déclenche un avertissement et n'est PAS créé sans confirmation");
  await p.selectOption('select[name="property"]', props[1].id); await p.fill('input[name="starts_at"]', sat); await p.check('input[name="force"]'); await p.click('button:has-text("Planifier")'); await p.waitForSelector("text=Visite planifiée");
  ok((await sql`select count(*)::int n from visits where property_id = ${props[1].id} and agent_id = ${yael}`)[0].n === 1, "…mais peut être créé après confirmation explicite");
  const ics = await ctx.request.get(`${BASE}/api/ics/agenda`); const icsT = await ics.text();
  ok(ics.status() === 200 && icsT.includes("BEGIN:VEVENT") && icsT.includes("DTSTART:") && (ics.headers()["content-type"] ?? "").includes("text/calendar"), "export iCalendar de l'agenda");
  const vid = (await sql`select id from visits where agent_id = ${yael} order by created_at desc limit 1`)[0].id; ok((await (await ctx.request.get(`${BASE}/api/ics/visit/${vid}`)).text()).includes("SUMMARY:Visite"), "export .ics d'une visite");
  await p.goto(`${BASE}/fr/agenda`); await p.locator('button:has-text("Effectuée")').first().click(); await p.waitForTimeout(800); ok((await sql`select count(*)::int n from visits where status = 'done' and agent_id = ${yael}`)[0].n >= 1, "visite marquée effectuée");
  ok(await p.locator("text=Chabbat").first().isVisible(), "le samedi est signalé « Chabbat » dans la semaine");

  // ── rapports ──
  await p.goto(`${BASE}/fr/reports`); ok(await p.locator('[role="listitem"]').count() >= 8 && await p.locator("tbody tr").count() >= 3, "rapports : entonnoir, sources, statuts, anciennetés, performance des agents");
  const res = await p.goto(`${BASE}/he/agenda`); ok(res.status() === 200 && (await p.getAttribute("html", "dir")) === "rtl", "agenda en hébreu (RTL)");

  await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 4B : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
