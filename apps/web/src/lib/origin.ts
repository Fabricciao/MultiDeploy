/** Adresse publique de la requête, derrière un proxy (Traefik) : l'URL interne du conteneur (0.0.0.0:3000) ne doit jamais fuiter dans une redirection. */
export function publicOrigin(req: Request): string {
  const h = req.headers;
  const own = new URL(req.url);
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]!.trim();
  const proto = (h.get("x-forwarded-proto") ?? own.protocol.replace(":", "")).split(",")[0]!.trim();
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) || !/^https?$/.test(proto)) return own.origin;
  return `${proto}://${host}`;
}
