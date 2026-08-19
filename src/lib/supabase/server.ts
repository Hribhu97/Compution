import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";

export type PagesRouterServerContext = {
  req: GetServerSidePropsContext["req"] | NextApiRequest;
  res: GetServerSidePropsContext["res"] | NextApiResponse;
};

export type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createClient(context?: PagesRouterServerContext) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          if (!context?.req?.cookies) return [];
          return Object.entries(context.req.cookies).map(([name, value]) => ({
            name,
            value: value ?? "",
          }));
        },
        setAll(cookiesToSet: CookieToSet[]) {
          if (!context?.res) return;
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieStr = serializeCookie(name, value, options);
            const prevHeader = context.res.getHeader("Set-Cookie");
            if (!prevHeader) {
              context.res.setHeader("Set-Cookie", cookieStr);
            } else if (Array.isArray(prevHeader)) {
              context.res.setHeader("Set-Cookie", [...prevHeader, cookieStr]);
            } else {
              context.res.setHeader("Set-Cookie", [String(prevHeader), cookieStr]);
            }
          });
        },
      },
    }
  );
}

function serializeCookie(name: string, value: string, options?: CookieOptions): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (!options) return cookie;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.path) cookie += `; Path=${options.path}`;
  else cookie += `; Path=/`;
  if (options.expires) {
    const exp = typeof options.expires.toUTCString === "function" ? options.expires.toUTCString() : options.expires;
    cookie += `; Expires=${exp}`;
  }
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.secure) cookie += `; Secure`;
  if (options.sameSite) {
    const s = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
    if (s === "lax") cookie += `; SameSite=Lax`;
    else if (s === "strict") cookie += `; SameSite=Strict`;
    else if (s === "none") cookie += `; SameSite=None`;
  }
  return cookie;
}
