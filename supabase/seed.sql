-- Données de démonstration (FICTIVES). Agence : Eliezer.immo (démo). Idempotent : ne fait rien si l'agence existe.
do $$
declare
  org uuid; u_owner uuid := '11111111-1111-1111-1111-000000000001'; u_a uuid := '11111111-1111-1111-1111-000000000002'; u_b uuid := '11111111-1111-1111-1111-000000000003';
  cities uuid[]; i int; c uuid; p uuid; st uuid[]; s_open uuid[];
  fn text[] := array['Dana','Michaël','Sarah','Yoni','Noa','Éric','Tal','Rina','Gabriel','Léa','Avi','Hadar','Samuel','Mia','Daniel','Chloé','Eitan','Ruth','Ilan','Yaël'];
  fnh text[] := array['דנה','מיכאל','שרה','יוני','נועה','אריק','טל','רינה','גבריאל','לאה','אבי','הדר','שמואל','מיה','דניאל','קלואי','איתן','רות','אילן','יעל'];
  ln text[] := array['Lévi','Cohen','Azoulay','Ben-David','Peretz','Bensoussan','Sasson','Haim','Dray','Mizrahi','Amar','Attias','Bitton','Chetrit','Dahan'];
  lnh text[] := array['לוי','כהן','אזולאי','בן דוד','פרץ','בן סוסן','ששון','חיים','דריי','מזרחי','עמר','אטיאס','ביטון','שטרית','דהן'];
  streets text[] := array['Ahuza','Weizmann','Herzl','Jabotinsky','HaPalmach','Rothschild','Ben Gurion','Hanassi','Sokolov','Bialik','HaGefen','Hess'];
  ptypes text[] := array['apartment','apartment','apartment','garden_apt','duplex','penthouse','house'];
  loc text[] := array['fr','fr','he','he','en'];
  r numeric; pr numeric; stat public.property_status; k int; dstage uuid;
begin
  if exists (select 1 from public.organizations where slug = 'eliezer') then return; end if;
  insert into auth.users (id, email, raw_user_meta_data) values
    (u_owner, 'yael@eliezer.demo', '{"full_name":"Yaël Lévy"}'),
    (u_a, 'david@eliezer.demo', '{"full_name":"David Mizrahi"}'),
    (u_b, 'avi@eliezer.demo', '{"full_name":"Avi Bensimon"}') on conflict do nothing;
  org := public.provision_organization('eliezer', 'Eliezer.immo', 'אליעזר נדל״ן', 'Eliezer.immo', 'fr', u_owner);
  update public.organizations set plan = 'pro' where id = org; update public.subscriptions set plan = 'pro', status = 'active' where organization_id = org;
  insert into public.memberships (organization_id, user_id, role) values (org, u_a, 'agent'), (org, u_b, 'agent');
  update public.profiles set active_organization_id = org where id in (u_a, u_b);
  select array_agg(id order by name_fr) into cities from public.geo_places where name_fr in ('Raanana','Kfar Saba','Herzliya','Netanya','Hod HaSharon','Modiin');

  -- 28 biens
  for i in 1..28 loop
    r := (array[3,3.5,4,4,4.5,5,5])[1 + (i % 7)];
    pr := round((1200000 + r * 520000 + (i % 5) * 150000) / 10000) * 10000;
    stat := (array['active','active','active','active','active','under_offer','draft','sold'])[1 + (i % 8)]::public.property_status;
    insert into public.properties (organization_id, transaction, property_type, status, agent_id, city_id, street, house_number, price, rooms, area_built, floor, floors_total,
        mamad, parking_count, elevator, sukkah_balcony, storage, ac, arnona_monthly, vaad_bayit_monthly, registration_type, mandate, published_at, public_token)
    values (org, case when i % 6 = 0 then 'rent'::public.transaction_type else 'sale' end, ptypes[1 + (i % 7)], stat,
        (array[u_owner,u_a,u_b])[1 + (i % 3)], cities[1 + (i % 6)], streets[1 + (i % 12)], (10 + i * 3)::text,
        case when i % 6 = 0 then round(pr / 300 / 100) * 100 else pr end, r, round(r * 27 + (i % 4) * 6), (i % 6), 6,
        i % 5 <> 0, (i % 3), i % 4 <> 0, i % 3 = 0, i % 4 = 1, i % 2 = 0, 450 + (i % 5) * 60, 250 + (i % 4) * 50, 'tabu',
        case when i % 3 = 0 then jsonb_build_object('type','exclusive','start', current_date - 60, 'end', current_date + (i * 7) % 120 - 10, 'commission_pct', 2) else '{"type":"non_exclusive"}'::jsonb end,
        now() - (i || ' days')::interval, encode(extensions.gen_random_bytes(12), 'hex'))
    returning id into p;
    insert into public.property_translations (property_id, organization_id, locale, title, description, origin, reviewed) values
      (p, org, 'fr', r || ' pièces · rue ' || streets[1 + (i % 12)], 'Appartement lumineux et bien entretenu, proche des commerces et des écoles. Séjour ouvert, cuisine équipée, belle exposition.', 'manual', true),
      (p, org, 'he', r || ' חדרים · רחוב ' || streets[1 + (i % 12)], 'דירה מוארת ומטופחת, קרוב למסחר ולמוסדות חינוך. סלון פתוח, מטבח מאובזר, חשיפה מצוינת.', 'ai', false);
  end loop;

  -- 36 contacts + critères
  for i in 1..36 loop
    insert into public.contacts (organization_id, kinds, first_name, last_name, first_name_he, last_name_he, phones, emails, preferred_locale, aliyah_status, owner_id, budget_max, budget_currency, marketing_consent,
        source_id, tags)
    values (org, case when i % 9 = 0 then '{seller}'::public.contact_kind[] when i % 7 = 0 then '{investor}' else '{buyer}' end,
      fn[1 + (i % 20)], ln[1 + (i % 15)], fnh[1 + (i % 20)], lnh[1 + (i % 15)],
      jsonb_build_array(jsonb_build_object('e164', '+97250' || lpad((1000000 + i * 7919)::text, 7, '0'), 'is_whatsapp', i % 3 <> 0)),
      jsonb_build_array(jsonb_build_object('email', lower(fn[1 + (i % 20)]) || i || '@example.com')),
      loc[1 + (i % 5)], (array['recent','pre_aliyah','resident','none'])[1 + (i % 4)], (array[u_owner,u_a,u_b])[1 + (i % 3)],
      (2000000 + (i % 8) * 400000), 'ILS', jsonb_build_object('granted', i % 5 <> 0, 'at', now()),
      (select id from public.lead_sources where organization_id = org order by position offset (i % 5) limit 1),
      case when i % 4 = 0 then '{vip}'::text[] else '{}' end)
    returning id into c;
    if i % 9 <> 0 then
      insert into public.contact_search_profiles (organization_id, contact_id, transaction, property_types, city_ids, price_max, rooms_min, rooms_max, must_have, nice_to_have)
      values (org, c, case when i % 11 = 0 then 'rent'::public.transaction_type else 'sale'::public.transaction_type end,
        case when i % 4 = 0 then '{apartment,garden_apt}'::text[] else '{}' end,
        array[cities[1 + (i % 6)], cities[1 + ((i + 1) % 6)]],
        2000000 + (i % 8) * 400000, 3 + (i % 3) * 0.5, 4.5 + (i % 3) * 0.5,
        case when i % 2 = 0 then '{mamad,parking}'::text[] else '{mamad}' end, case when i % 3 = 0 then '{elevator}'::text[] else '{}' end);
      update public.contact_search_profiles set price_max = price_max / 400 where transaction = 'rent' and contact_id = c;
    end if;
    insert into public.activities (organization_id, kind, contact_id, actor_id, summary, occurred_at)
    values (org, 'note', c, (array[u_owner,u_a,u_b])[1 + (i % 3)], 'Premier contact : ' || (array['appel entrant','formulaire du site','recommandation'])[1 + (i % 3)], now() - ((i % 20) || ' days')::interval);
  end loop;

  -- affaires, tâches, visites
  select array_agg(id order by position) into s_open from public.pipeline_stages where organization_id = org and kind = 'open';
  for i in 1..18 loop
    select id into c from public.contacts where organization_id = org order by created_at, id offset (i - 1) limit 1;
    select id into p from public.properties where organization_id = org and status in ('active','under_offer') order by created_at, id offset ((i * 2) % 20) limit 1;
    insert into public.deals (organization_id, contact_id, property_id, stage_id, agent_id, value, commission_pct, expected_close, position, title)
    values (org, c, p, s_open[1 + (i % 6)], (array[u_owner,u_a,u_b])[1 + (i % 3)], 1800000 + (i % 9) * 450000, 2, current_date + (i * 5), i, null);
  end loop;
  for i in 1..14 loop
    select id into c from public.contacts where organization_id = org order by created_at, id offset (i + 2) limit 1;
    insert into public.tasks (organization_id, title, due_at, assignee_id, contact_id, created_by)
    values (org, (array['Relancer après la visite','Envoyer le dossier','Demander l''attestation hypothécaire','Proposer une visite samedi soir','Rappeler le propriétaire'])[1 + (i % 5)],
      date_trunc('day', now()) + ((i % 4) - 1 || ' days')::interval + interval '17 hours', (array[u_owner,u_a,u_b])[1 + (i % 3)], c, u_owner);
  end loop;
  for i in 1..6 loop
    select id into p from public.properties where organization_id = org and status = 'active' order by created_at, id offset i limit 1;
    select id into c from public.contacts where organization_id = org order by created_at, id offset (i + 5) limit 1;
    insert into public.visits (organization_id, property_id, contact_id, agent_id, starts_at, ends_at)
    values (org, p, c, (array[u_owner,u_a,u_b])[1 + (i % 3)], date_trunc('day', now()) + ((i % 3) || ' days')::interval + (9 + i || ' hours')::interval, date_trunc('day', now()) + ((i % 3) || ' days')::interval + (10 + i || ' hours')::interval);
  end loop;
end $$;

-- Administrateur de plateforme de démonstration (sans agence)
insert into auth.users (id, email, raw_user_meta_data) values ('11111111-1111-1111-1111-0000000000aa', 'root@platform.demo', '{"full_name":"Fabrice (plateforme)"}') on conflict do nothing;
insert into public.platform_admins (user_id) select id from public.profiles where id = '11111111-1111-1111-1111-0000000000aa' on conflict do nothing;
