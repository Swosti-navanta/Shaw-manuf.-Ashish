import { NextResponse, type NextRequest } from "next/server";
import { PERSONA_COOKIE } from "@/lib/persona";
import {
  DEFAULT_PERSONA,
  PERSONA_HOME,
  isPathAllowedForPersona,
  isPersona,
  type Persona,
} from "@/types/persona";

// Every agent surface in the portal. Division is intentionally absent here —
// it filters data, it does not gate routes.
const PROTECTED_PREFIXES = [
  "/overview",
  "/make",
  "/quality",
  "/scheduling",
  "/yarn",
  "/performance",
  "/thresholds",
  "/settings",
  "/p-card",
];

function readPersona(req: NextRequest): Persona {
  const value = req.cookies.get(PERSONA_COOKIE)?.value;
  return isPersona(value) ? value : DEFAULT_PERSONA;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const persona = readPersona(req);

  // Root always resolves to the active persona's home, so the first thing
  // you see is the surface you own.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = PERSONA_HOME[persona];
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Persona route guard — a path outside this persona's allowlist bounces
  // to their home rather than rendering a page they have no nav to.
  if (isProtected && !isPathAllowedForPersona(pathname, persona)) {
    const url = req.nextUrl.clone();
    url.pathname = PERSONA_HOME[persona];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/overview/:path*",
    "/make/:path*",
    "/quality/:path*",
    "/scheduling/:path*",
    "/yarn/:path*",
    "/performance/:path*",
    "/thresholds/:path*",
    "/settings/:path*",
    "/p-card/:path*",
  ],
};
