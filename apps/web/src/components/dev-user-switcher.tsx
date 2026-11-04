import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { DEV_USER_COOKIE, devImpersonationEnabled } from "@/lib/session";

/** Sélecteur d'utilisateur de DÉVELOPPEMENT (absent en production et dès que Supabase est configuré). */
export async function DevUserSwitcher({ current }: { current: string }) {
  if (!devImpersonationEnabled()) return null;
  const users = await sql`select p.id, p.full_name, coalesce(m.role::text, case when pa.user_id is not null then 'platform' end) as role from public.profiles p join auth.users u on u.id = p.id left join public.memberships m on m.user_id = p.id left join public.platform_admins pa on pa.user_id = p.id order by u.email`;
  async function switchUser(fd: FormData) {
    "use server";
    if (!devImpersonationEnabled()) return;
    (await cookies()).set(DEV_USER_COOKIE, String(fd.get("user")), { path: "/", httpOnly: true, sameSite: "lax" });
    revalidatePath("/", "layout");
  }
  return (
    <form action={switchUser} className="row" style={{ gap: 6 }} title="dev only">
      <span className="badge warn">dev</span>
      <select name="user" defaultValue={current} className="input" style={{ height: 28, width: 170, fontSize: 12 }}>
        {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} · {u.role}</option>)}
      </select>
      <button className="btn sm">OK</button>
    </form>
  );
}
