/** Résolution d'agence par nom d'hôte : <slug>.<domaine-de-l'app>. Fonction pure (testée). */
const RESERVED = new Set(["www", "app", "api", "platform", "admin", "mail", "status", "docs", "static", "cdn"]);

export function appDomains(env = process.env.APP_DOMAINS ?? ""): string[] {
  return env.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export type HostKind = { kind: "subdomain"; slug: string } | { kind: "custom"; host: string } | { kind: "none" };

export function classifyHost(rawHost: string | null | undefined, domains = appDomains()): HostKind {
  const host = (rawHost ?? "").toLowerCase().split(":")[0]!.trim();
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return { kind: "none" };
  for (const d of domains) {
    if (host === d) return { kind: "none" };
    if (host.endsWith(`.${d}`)) {
      const sub = host.slice(0, -(d.length + 1));
      if (/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(sub) && !RESERVED.has(sub)) return { kind: "subdomain", slug: sub };
      return { kind: "none" };
    }
  }
  return domains.length ? { kind: "custom", host } : { kind: "none" };
}
