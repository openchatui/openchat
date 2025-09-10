import { v4 as uuid } from "uuid";
import { encode as defaultEncode } from "next-auth/jwt";
import type { JWT, JWTEncodeParams } from "next-auth/jwt";
import type { Account, User } from "next-auth";
import type { AdapterUser } from "@auth/core/adapters";

import db from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { schema } from "@/lib/schema";
import bcrypt from "bcryptjs";

const adapter = PrismaAdapter(db);

// Configuration object for getServerSession
export const authOptions = {
  adapter,
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
      return params.token;
    },
  },
  jwt: {
    encode: async function (params: JWTEncodeParams) {
      if (params.token?.credentials) {
        const sessionToken = uuid();

        if (!params.token.sub) {
          throw new Error("No user ID found in token");
        }

        const createdSession = await adapter?.createSession?.({
          sessionToken: sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        if (!createdSession) {
          throw new Error("Failed to create session");
        }

        return sessionToken;
      }
      return defaultEncode(params);
    },
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);