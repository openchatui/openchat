import type { User } from '@prisma/client';

// Core auth types
export interface ExtendedUser extends User {
  role: 'ADMIN' | 'USER';
}

export interface JWTCallbackParams {
  token: any;
  user?: ExtendedUser;
  account?: any;
  profile?: any;
  isNewUser?: boolean;
}

export interface SessionCallbackParams {
  session: any;
  token: any;
  user?: ExtendedUser;
}

export interface AuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: 'ADMIN' | 'USER';
  };
  expires: string;
}

export interface SignUpData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: ExtendedUser;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export interface UserCreation {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  createdAt: Date;
}
