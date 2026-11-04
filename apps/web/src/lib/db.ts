import postgres from "postgres";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant (voir apps/web/.env.example).");
  // prepare:false → compatible pooler Supabase (mode transaction)
  return postgres(url, { max: 8, prepare: false, idle_timeout: 20, onnotice: () => {} });
}

/** Connexion privilégiée (rôle propriétaire). À n'utiliser que pour la résolution de session et les pages publiques par jeton. */
type SqlClient = ReturnType<typeof postgres>;
const client = (): SqlClient => (globalThis.__sql ??= connect());
/** Paresseux : la connexion n'est ouverte qu'au premier usage (permet d'importer les modules purs dans les tests). */
export const sql: SqlClient = new Proxy(function () {} as unknown as SqlClient, {
  get: (_t, prop) => (client() as never)[prop],
  apply: (_t, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
}) as SqlClient;
export type Sql = SqlClient;
export type Tx = postgres.TransactionSql;

/**
 * Exécute `fn` dans une transaction qui prend l'identité de l'utilisateur : rôle `authenticated` + claims JWT.
 * La RLS Postgres s'applique alors exactement comme via l'API Supabase.
 */
export async function withUser<T>(user: { userId: string; orgId: string | null; imp?: boolean }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: user.userId, role: "authenticated", ...(user.orgId ? { org_id: user.orgId } : {}), ...(user.imp ? { imp: "1" } : {}) });
  return (await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`set local role authenticated`;
    if (user.imp) await tx`set transaction read only`; // impersonation : lecture seule imposée par la base, pas seulement par l'UI
    return fn(tx as unknown as Tx);
  })) as T;
}
