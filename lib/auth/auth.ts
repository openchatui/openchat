import { v4 as uuid } from "uuid";
import { encode as defaultEncode } from "next-auth/jwt";
import type { JWT, JWTEncodeParams } from "next-auth/jwt";
import type { Account, User } from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";

import db from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { schema } from "@/lib/auth/schema";
import bcrypt from "bcryptjs";

const adapter = PrismaAdapter(db);

// Configuration object for getServerSession
export const authOptions = {
  adapter,
  session: { strategy: "jwt" as const },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const validatedCredentials = schema.parse(credentials);

        const user = await db.user.findUnique({
          where: {
            email: validatedCredentials.email,
          },
        });

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        if (!user.hashedPassword) {
          throw new Error("Invalid credentials.");
        }

        const passwordMatch = await bcrypt.compare(validatedCredentials.password, user.hashedPassword);

        if (!passwordMatch) {
          throw new Error("Invalid credentials.");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt(params: {
      token: JWT;
      user?: User | AdapterUser;
      account?: Account | null;
      profile?: any;
      trigger?: "signIn" | "signUp" | "update";
      isNewUser?: boolean;
      session?: any;
    }) {
      if (params.account?.provider === "credentials") {
        params.token.credentials = true;
      }
      // Carry role from User to token on sign-in
      if (params.user && "role" in params.user) {
        // Prisma enum Role is e.g. "ADMIN" | "USER"
        // Store as-is on the token for edge-safe checks
        // @ts-ignore - custom claim
        params.token.role = (params.user as any).role;
      }
      return params.token;
    },
    async session({ session, token }: any) {
      if (session?.user && token) {
        // Expose role to the session user
        // @ts-ignore - augmenting session user shape
        session.user.role = (token as any).role;
        // Ensure id is available for server components using session.user.id
        // @ts-ignore - augmenting session user shape
        session.user.id = (token as any).sub;
      }
      return session;
    },
    authorized({ auth, request }: any) {
      const { pathname } = request.nextUrl;
      const isAdminArea =
        pathname.startsWith("/admin") ||
        pathname === "/api/users" ||
        pathname.startsWith("/api/users/") ||
        pathname === "/api/connections" ||
        pathname.startsWith("/api/connections/");

      const isLoggedIn = !!auth?.user;
      if (!isLoggedIn) return false; // will redirect to signIn page for pages, 401 for APIs

      const userRole = (auth.user as any)?.role;
      const isAdmin = userRole === "ADMIN";

      if (isAdminArea && !isAdmin) {
        // Hide admin APIs from non-admins
        if (pathname.startsWith("/api/")) {
          return new Response("Not Found", { status: 404 });
        }
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);