import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const ROLE_GUARDS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/dashboard/manager", roles: ["MANAGER"] },
  { prefix: "/dashboard/supervisor", roles: ["SUPERVISOR"] },
  { prefix: "/dashboard/admin/transfer", roles: ["ADMIN", "STAFF"] },
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/staff", roles: ["ADMIN", "STAFF"] },
]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    if (!token && pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const guard = ROLE_GUARDS.find((item) => pathname.startsWith(item.prefix))
    if (guard && !guard.roles.includes(String(token?.role || ""))) {
      const role = String(token?.role || "")
      const fallback =
        role === "MANAGER" ? "/dashboard/manager" :
        role === "SUPERVISOR" ? "/dashboard/supervisor" :
        role === "ADMIN" ? "/dashboard/admin" :
        role === "STAFF" ? "/dashboard/staff" :
        "/login"

      return NextResponse.redirect(new URL(fallback, req.url))
    }

    return NextResponse.next()
  },
  { callbacks: { authorized: ({ token }) => !!token } }
)

export const config = { matcher: ["/dashboard/:path*"] }
