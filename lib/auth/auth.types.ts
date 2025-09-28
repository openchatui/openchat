import type { Account, User, Session, Profile } from "next-auth";
import type { JWT, JWTEncodeParams } from "next-auth/jwt";
import type { AdapterUser } from "next-auth/adapters";

// Custom types for extended session and token
// Note: These match the database values (mapped from Prisma enum)
export type Role = "user" | "admin";

export interface ExtendedToken extends JWT {
  credentials?: boolean;
  role?: Role;
}

export interface ExtendedSession extends Session {
  user: Session["user"] & {
    id: string;
    role?: Role;
  };
}

export interface ExtendedUser extends User {
  role?: Role;
}

export interface JWTCallbackParams {
  token: ExtendedToken;
  user?: ExtendedUser | AdapterUser;
  account?: Account | null;
  profile?: Profile;
  trigger?: "signIn" | "signUp" | "update";
  isNewUser?: boolean;
  session?: ExtendedSession;
}

export interface SessionCallbackParams {
  session: ExtendedSession;
  token: ExtendedToken;
}