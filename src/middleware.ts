import { NextResponse, type NextRequest } from "next/server";

// Sliding-refresh for the viewer (bf_user) and gate (bf_gate) cookies.
// Page Server Components in Next 15 cannot call cookies().set() during render,
// so the refresh has to live here in middleware. Two non-obvious points to
// preserve for future contributors:
//
// (a) We re-emit the EXISTING cookie value with a fresh Max-Age — we do NOT
//     re-sign it. If COOKIE_SECRET is rotated, an old-signature cookie still
//     gets its expiry pushed out here, then is cleanly rejected downstream by
//     auth.ts unpack(). Harmless, but worth knowing if you ever debug "why is
//     this dead cookie still being refreshed?".
//
// (b) Vercel disables shared-cache caching for any response carrying
//     Set-Cookie, so this middleware never causes per-user cookies to land in
//     someone else's cached response. Do NOT add an explicit Cache-Control
//     here that would override that default.
//
// GET-only on purpose: state-changing POSTs (e.g. /abmelden, /anmelden/do,
// admin /do routes) emit their own Set-Cookie headers, and stacking another
// Set-Cookie for bf_user on top of those makes header ordering implementation-
// defined. Sliding refresh is a page-load concern anyway.

const VIEWER_COOKIE = "bf_user";
const GATE_COOKIE = "bf_gate";
const VIEWER_MAX_AGE = 60 * 60 * 24 * 365; // must match VIEWER_COOKIE_MAX_AGE in src/lib/auth.ts
const GATE_MAX_AGE = 60 * 60 * 24 * 60; //   must match GATE_COOKIE_MAX_AGE   in src/lib/auth.ts

export const config = {
  matcher: [
    "/((?!_next/|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json)$).*)",
  ],
};

export function middleware(req: NextRequest) {
  if (req.method !== "GET") return NextResponse.next();
  const viewer = req.cookies.get(VIEWER_COOKIE);
  const gate = req.cookies.get(GATE_COOKIE);
  if (!viewer && !gate) return NextResponse.next();
  const res = NextResponse.next();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  if (viewer) {
    res.cookies.set(VIEWER_COOKIE, viewer.value, {
      ...opts,
      maxAge: VIEWER_MAX_AGE,
    });
  }
  if (gate) {
    res.cookies.set(GATE_COOKIE, gate.value, {
      ...opts,
      maxAge: GATE_MAX_AGE,
    });
  }
  return res;
}
