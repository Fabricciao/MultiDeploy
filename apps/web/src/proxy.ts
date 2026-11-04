import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

const intl = createIntlMiddleware(routing);
const PUBLIC = [/^\/(fr|he|en)\/(login|design)(\/|$)/, /^\/(fr|he|en)\/(p|l)\//, /^\/(fr|he|en)\/unsubscribe\//];

export default async function proxy(req: NextRequest) {
  const res = intl(req);
  const { configured, user } = await refreshSession(req, res);
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((r) => r.test(pathname));
  if (configured && !user && !isPublic && /^\/(fr|he|en)(\/|$)/.test(pathname)) {
    const locale = pathname.split("/")[1];
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"] };
