import type {
  ExtendedUser,
  JWTCallbackParams,
  SessionCallbackParams
} from "./auth.types";

import db from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "../validation/auth.validation";
import { CredentialsProvider } from "../providers/credentials.provider";

const adapter = PrismaAdapter(db);

// Configuration object for NextAuth
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
        const validatedCredentials = loginSchema.parse(credentials);

        const user = await CredentialsProvider.authenticate(
          validatedCredentials.email,
          validatedCredentials.password
        );

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async jwt(params: any) {
      if (params.account?.provider === "credentials") {
        params.token.credentials = true;
      }
      // Carry role from User to token on sign-in
      if (params.user && "role" in params.user) {
        // Prisma enum Role is e.g. "ADMIN" | "USER"
        // Store as-is on the token for edge-safe checks
        params.token.role = (params.user as ExtendedUser).role;
      }
      return params.token;
    },
    async session(params: any) {
      const { session, token } = params;
      if (session?.user && token) {
        // Expose role to the session user
        session.user.role = token.role;
        // Ensure id is available for server components using session.user.id
        session.user.id = token.sub as string;
        // Keep user image in sync with DB each time the session is fetched
        try {
          const userId = token.sub as string | undefined;
          if (userId) {
            const dbUser = await db.user.findUnique({ 
              where: { id: userId }, 
              select: { image: true } 
            });
            if (dbUser?.image) {
              session.user.image = dbUser.image;
            }
          }
        } catch (err) {
          // ignore image sync errors
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
