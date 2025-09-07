import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token");

  // 📌 Si no hay token, redirigir al login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// 📌 Definir rutas protegidas
export const config = {
  matcher: ["/admin/dashboard", "/veterinario/dashboard", "/usuario/dashboard"],
};
