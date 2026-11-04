// E2E phase 2 : photos, charte depuis une URL, affiches (Chromium), saisie assistée. Prérequis : base de démo + serveur dev avec
//   BRAND_FETCH_ALLOW_PRIVATE=1 (autorise le serveur de fixtures local) — voir apps/web/e2e/README.md
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const sharp = require("sharp");
const http = require("node:http");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };

(async () => {
  // site de fixtures pour l'import de charte
  const logo = await sharp({ create: { width: 240, height: 90, channels: 3, background: "#0f766e" } }).png().toBuffer();
  const site = http.createServer((q, r) => {
    if (q.url === "/") { r.setHeader("content-type", "text/html"); r.end(`<html><head><title>Sharon Estates | Immobilier</title><meta name="theme-color" content="#0f766e"><meta property="og:site_name" content="Sharon Estates"><link rel="stylesheet" href="/s.css"></head><body><img class="logo" src="/logo.png"></body></html>`); }
    else if (q.url === "/s.css") { r.setHeader("content-type", "text/css"); r.end(":root{--accent:#d99a2b;--secondary:#14304a}body{font-family:'Rubik',sans-serif}"); }
    else if (q.url === "/logo.png") { r.setHeader("content-type", "image/png"); r.end(logo); }
    else { r.statusCode = 404; r.end(); }
  });
  await new Promise((r) => site.listen(0, "127.0.0.1", r));
  const SITE = `http://127.0.0.1:${site.address().port}`;

  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"] });
  const p = await ctx.newPage();
  const org = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const prop = (await sql`select id from properties where status = 'active' and organization_id = ${org} order by created_at limit 1`)[0].id;

  // ── 1. photos : validation du contenu, EXIF/GPS retirés, couverture, vignette ──
  await p.goto(`${BASE}/fr/properties/${prop}`);
  const withExif = await sharp({ create: { width: 1600, height: 1100, channels: 3, background: "#6688aa" } }).jpeg().withExif({ IFD0: { Copyright: "secret-gps-owner" } }).toBuffer();
  const second = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#aa8866" } }).png().toBuffer();
  await p.setInputFiles('input[name="photos"]', [{ name: "salon.jpg", mimeType: "image/jpeg", buffer: withExif }, { name: "cuisine.png", mimeType: "image/png", buffer: second }, { name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") }]);
  await p.click('button:has-text("Téléverser")');
  await p.waitForSelector("text=ce n'est pas une image");
  const media = await sql`select id, storage_path, thumb_path, is_cover, width from property_media where property_id = ${prop} order by position`;
  ok(media.length === 2, "2 photos valides enregistrées, le faux .jpg (texte) est refusé avec un message");
  ok(media[0].is_cover && !media[1].is_cover, "la première photo devient la couverture");
  const bytes = Buffer.from(await (await p.request.get(`${BASE}/api/files/${media[0].storage_path}`)).body());
  const meta = await sharp(bytes).metadata();
  ok(meta.format === "jpeg" && !meta.exif && !bytes.includes(Buffer.from("secret-gps-owner")), "EXIF/GPS supprimés du fichier stocké");
  ok((await p.request.get(`${BASE}/api/files/org/${"0".repeat(8)}-0000-0000-0000-000000000000/property_photo/${"1".repeat(8)}-1111-1111-1111-111111111111.jpg`)).status() === 404, "fichier d'une autre agence : 404");
  ok((await p.request.get(`${BASE}/api/files/../../etc/passwd`)).status() === 404, "tentative de path traversal : 404");
  await p.goto(`${BASE}/fr/properties?q=${(await sql`select reference from properties where id = ${prop}`)[0].reference}`);
  ok((await p.locator(`tbody img[src*="/api/files/"]`).count()) === 1, "la liste affiche la vignette de couverture");

  // ── 2. affiche sans mention légale : refusée ; niveaux IA indisponibles sans fournisseur ──
  await sql`update brand_kits set legal_footer = '{"fr":"","he":"","en":""}' where organization_id = ${org}`;
  await p.goto(`${BASE}/fr/properties/${prop}/poster`);
  ok(await p.locator("text=mention légale de l'agence").first().isVisible(), "sans mention légale : message bloquant affiché");
  ok((await p.locator('input[name="level"][value="enhanced"]').isDisabled()) && (await p.locator('input[name="level"][value="creative"]').isDisabled()), "niveaux « amélioré/créatif » désactivés sans fournisseur d'images");

  // ── 3. charte : URL bloquée, puis import du site de fixtures, application, version, thème ──
  await p.goto(`${BASE}/fr/settings/brand`);
  await p.fill('input[name="url"]', "http://169.254.169.254/latest/meta-data");
  await p.click('button:has-text("Analyser")');
  await p.waitForSelector("text=n'est pas autorisée");
  ok(true, "URL interne (métadonnées cloud) refusée");
  await p.fill('input[name="url"]', SITE);
  await p.click('button:has-text("Analyser")');
  await p.waitForSelector("text=Analyse terminée");
  ok((await p.inputValue('input[name="primary"]')) === "#0f766e" && (await p.inputValue('input[name="accent"]')) === "#d99a2b", "couleurs importées du site (theme-color + variable CSS)");
  await p.fill('textarea[name="legal_fr"]', "Eliezer.immo · Courtier agréé n° 12345 · Prix sous réserve");
  await p.fill('textarea[name="legal_he"]', "אליעזר נדל״ן · מתווך מורשה מס׳ 12345");
  const v0 = (await sql`select version from brand_kits where organization_id = ${org}`)[0].version;
  await p.click('button:has-text("Appliquer la charte")');
  await p.waitForSelector("text=Charte appliquée");
  const [bk] = await sql`select version, colors, logo_light_path from brand_kits where organization_id = ${org}`;
  ok(bk.version === v0 + 1 && bk.colors.primary === "#0f766e" && bk.logo_light_path, `charte enregistrée (v${bk.version}) avec logo importé`);
  ok((await sql`select count(*)::int n from brand_kit_versions where organization_id = ${org} and version = ${v0}`)[0].n === 1, "ancienne version archivée");
  await p.goto(`${BASE}/fr/properties`);
  const accent = await p.evaluate(() => [...document.querySelectorAll("style")].map((s) => s.textContent).join("").match(/--accent:(#[0-9a-f]{6})/g)?.pop());
  ok(!!accent && accent !== "--accent:#1f4fd8", `le thème de l'agence est appliqué à l'interface (${accent})`);

  // ── 4. affiches : FR portrait + HE story, dimensions, historique, crédits ──
  await p.goto(`${BASE}/fr/properties/${prop}/poster`);
  const before = (await sql`select coalesce(sum(delta),0)::float b from ai_credit_ledger where organization_id = ${org}`)[0].b;
  await p.uncheck('input[name="format"][value="portrait"]'); await p.check('input[name="format"][value="portrait"]'); await p.check('input[name="format"][value="story"]');
  await p.click('button:has-text("Générer")');
  await p.waitForSelector('a:has-text("Télécharger story")', { timeout: 60000 });
  const gens = await sql`select format, locale, width, height, level, credits::float c from poster_generations where property_id = ${prop} order by format`;
  ok(gens.length === 2 && gens.some((g) => g.format === "portrait" && g.width === 1080 && g.height === 1350) && gens.some((g) => g.format === "story" && g.height === 1920), "2 affiches générées aux dimensions exactes (1080×1350, 1080×1920)");
  const key = (await sql`select output_path from poster_generations where property_id = ${prop} and format = 'portrait'`)[0].output_path;
  const png = Buffer.from(await (await p.request.get(`${BASE}/api/files/${key}`)).body());
  const pm = await sharp(png).metadata();
  ok(pm.format === "png" && pm.width === 1080 && pm.height === 1350, "le PNG servi a les bonnes dimensions");
  ok((await sql`select coalesce(sum(delta),0)::float b from ai_credit_ledger where organization_id = ${org}`)[0].b === before, "niveau « fidèle » : 0 crédit consommé");
  await p.goto(`${BASE}/he/properties/${prop}/poster`); await p.selectOption('select[name="poster_locale"]', "he");
  await p.uncheck('input[name="format"][value="portrait"]'); await p.check('input[name="format"][value="square"]');
  await p.click('button:has-text("יצירה")'); await p.waitForSelector('a:has-text("הורדה")', { timeout: 60000 });
  ok((await sql`select count(*)::int n from poster_generations where property_id = ${prop} and locale = 'he'`)[0].n === 1, "affiche en hébreu générée");
  await p.screenshot({ path: "/tmp/claude-0/shots/e2e-poster-he.png", fullPage: true });

  // ── 5. page publique du bien (cible du QR) ──
  const tok = (await sql`select public_token from properties where id = ${prop}`)[0].public_token;
  const pub = await b.newContext(); const pp = await pub.newPage();
  const r = await pp.goto(`${BASE}/fr/l/${tok}`);
  ok(r.status() === 200 && (await pp.locator("article").count()) === 1 && (await pp.locator('img[src*="/api/public/photo/"]').count()) >= 1, "page publique du bien : photo + fiche, sans connexion");
  ok((await pp.request.get(`${BASE}/api/public/photo/${tok}/${media[0].id}`)).status() === 200, "photo publique servie par jeton");
  ok((await pp.request.get(`${BASE}/api/public/photo/${"a".repeat(24)}/${media[0].id}`)).status() === 404, "mauvais jeton : 404");
  await pub.close();

  // ── 6. saisie assistée (texte) : critères extraits, champs à vérifier, requis manquant, enregistrement ──
  await p.goto(`${BASE}/fr/intake?mode=text&target=contact`);
  await p.fill("textarea", "Dana Lévi, דנה לוי en hébreu, cherche un 4 pièces à Raanana ou Kfar Saba, budget maximum quatre millions. Il lui faut un mamad et un parking. Olé depuis trois mois, de Paris, parle français.");
  await p.click('button:has-text("Analyser")');
  await p.waitForURL(/\/fr\/intake\/[0-9a-f-]{36}$/);
  ok((await p.inputValue('input[name="first_name"]')) === "Dana" && (await p.inputValue('input[name="first_name_he"]')) === "דנה", "revue : nom latin et hébreu pré-remplis");
  ok((await p.inputValue('input[name="budget_max"]')) === "4000000" && (await p.inputValue('input[name="rooms_min"]')) === "4", "revue : budget (quatre millions → 4 000 000) et pièces");
  ok((await p.locator('input[name="city_ids"]:checked').count()) === 2 && (await p.locator('input[name="must_have"]:checked').count()) === 2, "revue : 2 villes et 2 indispensables cochés");
  ok(await p.locator("text=Il manque : téléphone").isVisible(), "revue : téléphone manquant signalé (jamais inventé)");
  ok((await p.locator("text=À vérifier").count()) >= 1, "revue : budget sans devise marqué « à vérifier »");
  await p.fill('input[name="phone"]', "052-777-0002");
  await p.click('button:has-text("Enregistrer")'); await p.waitForURL(/\/fr\/clients\/[0-9a-f-]{36}$/);
  const [dana] = await sql`select c.id, c.phone_primary_e164 ph, (select count(*)::int from contact_search_profiles s where s.contact_id = c.id and s.price_max = 4000000) np from contacts c where c.first_name = 'Dana' and c.last_name = 'Lévi' order by c.created_at desc limit 1`;
  ok(dana.ph === "+972527770002" && dana.np === 1, "client créé avec son profil de recherche");
  ok((await sql`select count(*)::int n from ai_jobs where status = 'done' and target_id = ${dana.id}`)[0].n === 1, "la tâche IA est clôturée et liée au client");

  await p.goto(`${BASE}/fr/intake?mode=text&target=property`);
  await p.fill("textarea", "Appartement à vendre 4 pièces, 112 m², étage 3 sur 6, rue Ahuza 24 à Raanana, prix 3 450 000 shekels, avec mamad, ascenseur et parking");
  await p.click('button:has-text("Analyser")'); await p.waitForURL(/\/fr\/intake\/[0-9a-f-]{36}$/);
  ok((await p.inputValue('input[name="price"]')) === "3450000" && (await p.inputValue('input[name="area_built"]')) === "112" && (await p.inputValue('input[name="street"]')) === "Ahuza", "bien dicté : prix, surface, rue extraits");
  await p.selectOption('select[name="status"]', "draft"); await p.click('button:has-text("Enregistrer")'); await p.waitForURL(/\/fr\/properties\/[0-9a-f-]{36}$/);
  ok(true, "bien créé depuis la saisie assistée");

  // ── 7. micro : l'enregistreur fonctionne (micro factice) ; sans fournisseur STT le serveur répond proprement ──
  await p.goto(`${BASE}/fr/intake?mode=voice&target=contact`);
  ok(await p.locator("text=Transcription vocale non configurée").first().isVisible(), "voix : absence de fournisseur STT signalée à l'utilisateur");
  await p.click('button:has-text("Enregistrer")'); await p.waitForTimeout(2500); await p.click('button:has-text("Terminer")');
  await p.waitForSelector("audio");
  ok(true, "enregistreur : capture du micro et lecture du son");
  await p.click('button:has-text("Analyser")'); await p.waitForSelector('[role="alert"]:has-text("Transcription vocale non configurée")');
  ok(true, "envoi audio sans STT : erreur claire affichée");
  ok((await sql`select count(*)::int n from ai_jobs where kind = 'intake_voice'`)[0].n === 0, "aucune tâche ni audio conservés");

  await site.close(); await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 2 : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
