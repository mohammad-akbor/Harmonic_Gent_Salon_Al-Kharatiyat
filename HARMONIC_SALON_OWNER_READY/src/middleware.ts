import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Full route protection — URL hit /admin without login → /login
 * Role mismatch → safe redirect
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = (token as any)?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // Strict admin-only panels
    const adminStrict = ["/admin", "/salary", "/customers", "/reports"];
    if (adminStrict.some((p) => path === p || path.startsWith(p + "/"))) {
      if (role !== "admin") {
        if (role === "manager" || role === "staff") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Admin + Manager
    const adminManager = ["/finance", "/inventory"];
    if (adminManager.some((p) => path === p || path.startsWith(p + "/"))) {
      if (role !== "admin" && role !== "manager") {
        if (role === "staff") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Staff + Admin + Manager
    const staffArea = ["/dashboard", "/attendance", "/daily-entry", "/whatsapp", "/staff-profile"];
    if (staffArea.some((p) => path === p || path.startsWith(p + "/"))) {
      if (!["admin", "manager", "staff"].includes(role || "")) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Any logged-in user
    if (path.startsWith("/my-bookings") || path.startsWith("/settings")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const protectedPrefixes = [
          "/admin",
          "/dashboard",
          "/finance",
          "/salary",
          "/inventory",
          "/customers",
          "/reports",
          "/attendance",
          "/daily-entry",
          "/whatsapp",
          "/staff-profile",
          "/my-bookings",
          "/settings",
        ];
        if (protectedPrefixes.some((p) => path === p || path.startsWith(p + "/"))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/finance/:path*",
    "/salary/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/reports/:path*",
    "/attendance/:path*",
    "/daily-entry/:path*",
    "/whatsapp/:path*",
    "/staff-profile/:path*",
    "/my-bookings/:path*",
    "/settings/:path*",
  ],
};
