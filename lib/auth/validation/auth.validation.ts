import { z } from 'zod';
import type { PasswordValidation } from '../core/auth.types';

/**
 * Authentication Validation Service
 */
export class AuthValidationService {
  // Password requirements
  static readonly PASSWORD_MIN_LENGTH = 8;
  static readonly PASSWORD_MAX_LENGTH = 128;

  // Username requirements  
  static readonly USERNAME_MIN_LENGTH = 3;
  static readonly USERNAME_MAX_LENGTH = 20;
  static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

  /**
   * Validate password strength
   */
  static validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`);
    }

    if (password.length > this.PASSWORD_MAX_LENGTH) {
      errors.push(`Password must be no more than ${this.PASSWORD_MAX_LENGTH} characters long`);
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate username format
   */
  static validateUsername(username: string): { isValid: boolean; error?: string } {
    if (username.length < this.USERNAME_MIN_LENGTH) {
      return { 
        isValid: false, 
        error: `Username must be at least ${this.USERNAME_MIN_LENGTH} characters long` 
      };
    }

    if (username.length > this.USERNAME_MAX_LENGTH) {
      return { 
        isValid: false, 
        error: `Username must be no more than ${this.USERNAME_MAX_LENGTH} characters long` 
      };
    }

    if (!this.USERNAME_REGEX.test(username)) {
      return { 
        isValid: false, 
        error: 'Username can only contain letters, numbers, and underscores' 
      };
    }

    return { isValid: true };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailSchema = z.string().email();
    const result = emailSchema.safeParse(email);
    
    if (!result.success) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }
}

// Zod schemas for validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(AuthValidationService.USERNAME_MIN_LENGTH, `Username must be at least ${AuthValidationService.USERNAME_MIN_LENGTH} characters long`)
    .max(AuthValidationService.USERNAME_MAX_LENGTH, `Username must be no more than ${AuthValidationService.USERNAME_MAX_LENGTH} characters long`)
    .regex(AuthValidationService.USERNAME_REGEX, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(AuthValidationService.PASSWORD_MIN_LENGTH, `Password must be at least ${AuthValidationService.PASSWORD_MIN_LENGTH} characters long`)
    .max(AuthValidationService.PASSWORD_MAX_LENGTH, `Password must be no more than ${AuthValidationService.PASSWORD_MAX_LENGTH} characters long`),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignUpSchema = z.infer<typeof signUpSchema>;
