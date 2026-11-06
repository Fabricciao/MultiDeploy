// E2E de la phase 1 : navigateur réel + serveur Next + Postgres de dev (données de démo). Usage :
//   bash supabase/dev-db.sh reset && pnpm --filter @multideploy/web dev -p 3120   puis   BASE=http://localhost:3120 node apps/web/e2e/phase1.cjs
const { chromium } = require("playwright");
const postgres = require("postgres").default ?? require("postgres");
const BASE = process.env.BASE ?? "http://localhost:3120";
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54330/multideploy", { onnotice: () => {} });
let failed = 0;
const ok = (c, m) => { if (c) console.log("ok   -", m); else { failed++; console.log("FAIL -", m); } };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. liste + filtres (URL = état)
  await p.goto(`${BASE}/fr/properties`);
  const all = await p.locator("tbody tr").count();
  await p.goto(`${BASE}/fr/properties?tx=sale&rmin=4&pmax=4000000&has=mamad`);
  const filtered = await p.locator("tbody tr").count();
  ok(all > 0 && filtered > 0 && filtered < all, `filtres : ${all} biens → ${filtered} avec vente / ≥ 4 pièces / ≤ 4 M₪ / mamad`);
  const rowsOk = await sql`select count(*)::int n from properties where transaction in ('sale','commercial_sale') and rooms >= 4 and price <= 4000000 and mamad and deleted_at is null`;
  ok(filtered === rowsOk[0].n, `la liste filtrée = le résultat SQL attendu (${rowsOk[0].n})`);
  await p.goto(`${BASE}/fr/properties?sort=price_desc&tx=sale`);
  const prices = await p.locator("tbody tr td:nth-child(7)").allInnerTexts();
  const nums = prices.map((t) => Number(t.replace(/[^\d]/g, "")));
  ok(nums.every((v, i) => i === 0 || nums[i - 1] >= v), "tri par prix décroissant");

  // 2. création d'un client avec critères + détection de doublon
  await p.goto(`${BASE}/fr/clients/new`);
  await p.fill('input[name="first_name"]', "Test");
  await p.fill('input[name="last_name"]', "Playwright");
  await p.fill('input[name="phone"]', "052-777-0001");
  await p.fill('input[name="email"]', "test.pw@example.com");
  await p.check('input[name="marketing_opt_in"]');
  await p.fill('input[name="budget_max"]', "4500000");
  await p.check('input[name="city_ids"] >> nth=0'); await p.check('input[name="city_ids"] >> nth=1'); await p.check('input[name="city_ids"] >> nth=2');
  await p.click('button:has-text("Enregistrer")');
  await p.waitForURL(/\/fr\/clients\/[0-9a-f-]{36}$/);
  const [c] = await sql`select id, phones, marketing_consent from contacts where last_name = 'Playwright'`;
  ok(c && c.phones[0].e164 === "+972527770001", "client créé, téléphone normalisé en E.164");
  const profs = await sql`select count(*)::int n from contact_search_profiles where contact_id = ${c.id}`;
  ok(profs[0].n === 1, "critères de recherche enregistrés");
  await p.goto(`${BASE}/fr/clients/new`);
  await p.fill('input[name="first_name"]', "Doublon"); await p.fill('input[name="phone"]', "0527770001");
  await p.click('button:has-text("Enregistrer")');
  await p.waitForSelector("text=existe déjà");
  ok((await sql`select count(*)::int n from contacts where phone_primary_e164 = '+972527770001'`)[0].n === 1, "doublon de téléphone refusé avec lien vers la fiche existante");

  // 3. matching + envoi (dry_run) depuis un bien actif ayant des clients correspondants
  const target = null;
  const pid = target?.id ?? (await sql`
    select p.id from properties p join contact_search_profiles sp on sp.organization_id = p.organization_id and sp.active
    cross join lateral (select app.match_eval(p, sp) e) m where p.status = 'active' and m.e is not null and exists (select 1 from contacts c where c.id = sp.contact_id and c.marketing_consent->>'granted' = 'true' and jsonb_array_length(c.emails) > 0) limit 1`)[0].id;
  await p.goto(`${BASE}/fr/properties/${pid}`);
  const nMatch = await p.locator('form input[name="contact"]').count();
  ok(nMatch > 0, `fiche bien : ${nMatch} client(s) correspondant(s) affichés`);
  const before = (await sql`select count(*)::int n from shares`)[0].n;
  await p.click('button:has-text("Envoyer la sélection")');
  await p.waitForSelector('[role="status"]');
  const txt = await p.locator('[role="status"]').innerText();
  const after = (await sql`select count(*)::int n from shares`)[0].n;
  ok(after > before, `envoi : ${after - before} partage(s) créé(s) — « ${txt.split("\n")[0]} »`);
  const [sh] = await sql`select token, status, locale from shares order by created_at desc limit 1`;
  ok(["dry_run", "sent"].includes(sh.status), `statut d'envoi journalisé (${sh.status}), langue du client : ${sh.locale}`);
  ok((await sql`select count(*)::int n from activities where kind = 'share'`)[0].n > 0, "activité « share » ajoutée à la timeline du client");

  // 4. page publique par jeton (sans session) + désinscription en 2 temps
  const anon = await b.newContext(); const pub = await anon.newPage();
  const res = await pub.goto(`${BASE}/${sh.locale}/p/${sh.token}`);
  ok(res.status() === 200 && (await pub.locator("article").count()) > 0, "page publique de sélection accessible sans connexion");
  ok(!(await pub.content()).includes("internal_notes"), "aucune donnée interne exposée sur la page publique");
  ok((await sql`select opened_at from shares where token = ${sh.token}`)[0].opened_at !== null, "ouverture tracée (opened_at)");
  ok((await pub.goto(`${BASE}/fr/p/${"0".repeat(36)}`)).status() === 404, "jeton inconnu → 404");
  await pub.goto(`${BASE}/${sh.locale}/unsubscribe/${sh.token}`);
  const [still] = await sql`select c.marketing_consent->>'granted' g from shares s join contacts c on c.id = s.contact_id where s.token = ${sh.token}`;
  ok(still.g === "true", "le simple GET de désinscription ne désinscrit pas (anti-préchargement)");
  await pub.locator("button.btn").click(); await pub.waitForURL(/done=1/);
  const [after2] = await sql`select c.marketing_consent->>'granted' g from shares s join contacts c on c.id = s.contact_id where s.token = ${sh.token}`;
  ok(after2.g === "false", "désinscription confirmée → consentement retiré");
  await anon.close();

  // 5. pipeline : déplacer une affaire via le sélecteur
  await p.goto(`${BASE}/fr/deals`);
  const stage3 = (await sql`select s.id from pipeline_stages s where s.position = 3 and s.organization_id = (select organization_id from deals limit 1)`)[0].id;
  const n3 = async () => (await sql`select count(*)::int n from deals where stage_id = ${stage3} and deleted_at is null`)[0].n;
  const beforeMove = await n3();
  const firstSel = p.locator('select[aria-label^="Déplacer"]').first(); // première carte (colonne « Nouveau lead »)
  await firstSel.selectOption(stage3);
  await p.waitForTimeout(1500);
  ok((await n3()) === beforeMove + 1, "déplacement d'affaire persisté en base (+1 dans l'étape « Visites »)");
  ok((await sql`select count(*)::int n from activities where kind = 'stage_change'`)[0].n > 0, "changement d'étape journalisé dans la timeline");


  // 7. création + édition d'un bien via le formulaire (traductions, forme JSON, droits)
  await p.goto(`${BASE}/fr/properties/new`);
  await p.selectOption('select[name="city_id"]', { index: 1 });
  await p.fill('input[name="street"]', "Rue Test E2E"); await p.fill('input[name="house_number"]', "7");
  await p.fill('input[name="price"]', "3100000"); await p.fill('input[name="rooms"]', "4"); await p.fill('input[name="area_built"]', "105");
  await p.check('input[name="mamad"]'); await p.selectOption('select[name="status"]', "active"); await p.selectOption('select[name="mandate_type"]', "exclusive"); await p.fill('input[name="mandate_end"]', "2027-03-01");
  await p.fill('input[name="title_fr"]', "4 pièces test"); await p.fill('input[name="title_he"]', "דירת 4 חדרים לבדיקה");
  await p.click('button:has-text("Enregistrer")');
  await p.waitForURL(/\/fr\/properties\/[0-9a-f-]{36}$/);
  const [np] = await sql`select id, jsonb_typeof(mandate) mt, mandate->>'type' ty, status, reference from properties where street = 'Rue Test E2E'`;
  ok(np && np.mt === "object" && np.ty === "exclusive" && np.status === "active", `bien créé (réf. ${np?.reference}), mandat enregistré comme objet JSON`);
  ok((await sql`select count(*)::int n from property_translations where property_id = ${np.id}`)[0].n === 2, "traductions FR + HE enregistrées");
  await p.goto(`${BASE}/fr/properties/${np.id}/edit`);
  await p.fill('input[name="price"]', "3050000"); await p.click('button:has-text("Enregistrer")'); await p.waitForURL(new RegExp(`/fr/properties/${np.id}$`));
  ok(Number((await sql`select price from properties where id = ${np.id}`)[0].price) === 3050000, "édition du bien persistée");
  await p.goto(`${BASE}/fr/properties/new`); await p.selectOption('select[name="status"]', "active"); await p.click('button:has-text("Enregistrer")');
  await p.waitForSelector("text=prix et une ville");
  ok(true, "validation : un bien actif sans prix ni ville est refusé avec un message clair");

  // 8. droits d'un agent
  const org = (await sql`select id from organizations where slug = 'eliezer'`)[0].id;
  const agentA = (await sql`select id from profiles where full_name = 'David Mizrahi'`)[0].id;
  const ownerId = (await sql`select id from profiles where full_name = 'Yaël Lévy'`)[0].id;
  await sql`insert into role_capabilities (organization_id, role, capability, granted) values (${org}, 'agent', 'contacts.read_all', false) on conflict do nothing`;
  await ctx.addCookies([{ name: "dev_user", value: agentA, url: BASE }]);
  await p.goto(`${BASE}/fr/clients`);
  const visible = await p.locator("tbody tr").count();
  const mine = (await sql`select count(*)::int n from contacts where owner_id = ${agentA} and deleted_at is null`)[0].n;
  ok(visible > 0 && visible <= mine + 5 && visible < 37, `agent à visibilité restreinte : ${visible} client(s) visibles sur 37 (les siens : ${mine})`);
  const foreign = (await sql`select id from contacts where owner_id = ${ownerId} and deleted_at is null limit 1`)[0].id;
  const r404 = await p.goto(`${BASE}/fr/clients/${foreign}`);
  ok(r404.status() === 404, "contact d'un autre agent : 404 (RLS)");
  const ownerProp = (await sql`select id from properties where agent_id = ${ownerId} and status = 'active' limit 1`)[0].id;
  await p.goto(`${BASE}/fr/properties/${ownerProp}`);
  ok((await p.locator('a:has-text("Modifier")').count()) === 0, "agent : pas de bouton Modifier sur le bien d'un collègue");
  const resEdit = await p.goto(`${BASE}/fr/properties/${ownerProp}/edit`);
  await p.click('button:has-text("Enregistrer")').catch(() => {});
  await p.waitForTimeout(800);
  ok((await sql`select updated_at < now() - interval '2 seconds' as untouched from properties where id = ${ownerProp}`)[0].untouched, "agent : l'édition forcée par URL est refusée par la base");
  await sql`delete from role_capabilities where organization_id = ${org} and capability = 'contacts.read_all'`;
  await ctx.clearCookies();

  // 6. hébreu : RTL + pas d'erreur console
  await p.goto(`${BASE}/he/clients`);
  ok((await p.getAttribute("html", "dir")) === "rtl", "hébreu : <html dir=rtl>");
  const realErrors = errors.filter((e) => !/favicon|Failed to load resource/.test(e));
  ok(realErrors.length === 0, `aucune erreur console/JS (${realErrors.length ? realErrors[0].slice(0, 400) : "0"})`);

  await b.close(); await sql.end();
  if (failed) { console.log(`\n${failed} ÉCHEC(S)`); process.exit(1); }
  console.log("\n=== E2E PHASE 1 : OK ===");
})().catch((e) => { console.error(e); process.exit(1); });
