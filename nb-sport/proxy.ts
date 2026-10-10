import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

function isProtectedApi(pathname: string, method: string) {
  if (pathname === "/api/customers") return true;
  if (pathname === "/api/upload") return true;
  if (pathname === "/api/orders" && method === "GET") return true;
  if (pathname.startsWith("/api/orders/") && method === "PATCH") return true;
  if (pathname === "/api/products" && method === "POST") return true;
  if (pathname.startsWith("/api/products/") && (method === "PATCH" || method === "DELETE")) return true;
  if (pathname === "/api/categories" && method === "POST") return true;
  if (pathname.startsWith("/api/categories/") && method === "DELETE") return true;
  if (pathname === "/api/promotions") return true;
  if (pathname.startsWith("/api/promotions/")) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const protectedApi = pathname.startsWith("/api/") && isProtectedApi(pathname, request.method);

  if (!isAdminPage && !protectedApi) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  if (protectedApi) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
