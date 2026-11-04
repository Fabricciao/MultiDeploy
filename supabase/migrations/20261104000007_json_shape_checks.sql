-- Garde-fous de forme sur les colonnes JSON : un double encodage applicatif (chaîne JSON au lieu d'un tableau/objet)
-- est rejeté par la base au lieu de corrompre silencieusement les données.
alter table public.contacts
  add constraint contacts_phones_is_array check (jsonb_typeof(phones) = 'array'),
  add constraint contacts_emails_is_array check (jsonb_typeof(emails) = 'array'),
  add constraint contacts_consent_is_object check (marketing_consent is null or jsonb_typeof(marketing_consent) = 'object'),
  add constraint contacts_custom_is_object check (jsonb_typeof(custom) = 'object');
alter table public.properties
  add constraint properties_mandate_is_object check (mandate is null or jsonb_typeof(mandate) = 'object'),
  add constraint properties_custom_is_object check (jsonb_typeof(custom) = 'object');
alter table public.activities add constraint activities_payload_shape check (payload is null or jsonb_typeof(payload) = 'object');
