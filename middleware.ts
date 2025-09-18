export { auth as middleware } from "@/lib/auth/auth"

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/users",
    "/api/users/:path*",
    "/api/connections",
    "/api/connections/:path*",
  ],
}


