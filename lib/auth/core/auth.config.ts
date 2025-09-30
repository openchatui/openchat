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
import { v4 as uuid } from "uuid";
import GoogleProvider from "next-auth/providers/google";

const adapter = PrismaAdapter(db);

// Configuration object for NextAuth
export const authOptions = {
  adapter,
  session: { strategy: "jwt" as const },
  providers: [
    GoogleProvider({
      id: "google-drive",
      clientId: process.env.DRIVE_CLIENT_ID,
      clientSecret: process.env.DRIVE_CLIENT_SECRET,
      authorization: {
        params: {
          // Request offline access + explicit consent to obtain refresh_token
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
          // Minimal scope to list metadata. Use drive.readonly if you plan to download content.
          scope: 'openid email profile https://www.googleapis.com/auth/drive.metadata.readonly'
        }
      }
    }),
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
    async signIn({ user, account }: any) {
      try {
        if (account?.provider === 'credentials') {
          const sessionToken = uuid();
          await (adapter as any)?.createSession?.({
            sessionToken,
            userId: (user as any)?.id,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }
      } catch (err) {
        // Do not block sign-in on audit session write failure
        console.error('Session audit write failed:', err);
      }
      return true;
    },
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
  events: {
    async signOut({ token }: any) {
      try {
        const userId = token?.sub as string | undefined;
        if (!userId) return;
        await db.session.updateMany({
          where: { userId, expires: { gt: new Date() } },
          data: { expires: new Date() },
        });
      } catch (err) {
        console.error('SignOut session expire failed:', err);
      }
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
