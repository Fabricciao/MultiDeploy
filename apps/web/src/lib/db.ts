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
export const sql = (globalThis.__sql ??= connect());
export type Sql = typeof sql;
export type Tx = postgres.TransactionSql;

/**
 * Exécute `fn` dans une transaction qui prend l'identité de l'utilisateur : rôle `authenticated` + claims JWT.
 * La RLS Postgres s'applique alors exactement comme via l'API Supabase.
 */
export async function withUser<T>(user: { userId: string; orgId: string }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: user.userId, role: "authenticated", org_id: user.orgId });
  return (await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    await tx`set local role authenticated`;
    return fn(tx as unknown as Tx);
  })) as T;
}
