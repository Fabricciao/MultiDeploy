-- Niveaux de compte : le gérant (owner/admin) voit tous les biens et toutes les statistiques ;
-- l'agent ne voit que ses biens et ses statistiques, sauf si l'agence l'autorise (surcharge par agence, réglable dans Paramètres › Équipe).
insert into public.role_capabilities (organization_id, role, capability)
select null, x.role::public.member_role, x.cap
from (values
  ('owner','properties.read_all'),('owner','reports.read_all'),
  ('admin','properties.read_all'),('admin','reports.read_all'),
  ('assistant','properties.read_all'),
  ('viewer','properties.read_all')
) as x(role, cap)
on conflict do nothing;
