-- HTTPS obligatoire ; seule exception : http://localhost / 127.0.0.1 (développement) — l'application la refuse en production (SSRF) et via l'interface.
alter table public.webhook_endpoints drop constraint webhook_endpoints_url_check;
alter table public.webhook_endpoints add constraint webhook_endpoints_url_check check (url ~ '^https://' or url ~ '^http://(127\.0\.0\.1|localhost)(:[0-9]+)?(/|$)');
