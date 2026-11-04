-- Les administrateurs voient l'état des livraisons de leurs propres webhooks (lecture seule).
grant select on public.webhook_deliveries to authenticated;
create policy deliveries_select on public.webhook_deliveries for select to authenticated
  using ((select app.has_capability('api.manage')) and exists (select 1 from public.webhook_endpoints e where e.id = endpoint_id and e.organization_id = (select app.org_id())));
