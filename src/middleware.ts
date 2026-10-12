import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/suspended") return NextResponse.next();
  const url = process.env.CONTROL_URL;
  const key = process.env.SITE_KEY;
  if (!url || !key) return NextResponse.next();
  try {
    const res = await fetch(`${url}/api/status`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok && (await res.json()).status === "suspended") {
      return NextResponse.rewrite(new URL("/suspended", req.url));
    }
  } catch {
    // Portal unreachable: keep the website online.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
