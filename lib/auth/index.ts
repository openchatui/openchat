// Core authentication
export {
  AuthService,
} from './core/auth.service';

export {
  AuthActionsService,
} from './core/auth.actions';

import { AuthActionsService } from './core/auth.actions';

export {
  authOptions,
  handlers,
  signIn,
  signOut,
  auth,
} from './core/auth.config';

export type {
  ExtendedUser,
  JWTCallbackParams,
  SessionCallbackParams,
  AuthSession,
  SignUpData,
  LoginData,
  AuthResult,
  PasswordValidation,
  UserCreation,
} from './core/auth.types';

// Validation
export {
  AuthValidationService,
  loginSchema,
  signUpSchema,
} from './validation/auth.validation';

export type {
  LoginSchema,
  SignUpSchema,
} from './validation/auth.validation';

// Providers: Do NOT re-export server-only providers here to avoid Edge bundling

// Legacy compatibility exports
export { signUp } from './core/auth.actions';
import { loginSchema } from './validation/auth.validation';
export const schema = loginSchema; // For backward compatibility

// Create executeAction wrapper for backward compatibility
export async function executeAction<T>(options: {
  actionFn: () => Promise<T>;
  successMessage?: string;
}): Promise<{ success: boolean; message: string; data?: T }> {
  return AuthActionsService.executeAction(options.actionFn, options.successMessage);
}
