import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { AuthService } from '../core/auth.service';
import { AuthValidationService } from '../validation/auth.validation';
import type { ExtendedUser, AuthResult, SignUpData } from '../core/auth.types';

/**
 * Credentials Authentication Provider
 */
export class CredentialsProvider {
  /**
   * Authenticate user with email and password
   */
  static async authenticate(email: string, password: string): Promise<ExtendedUser | null> {
    try {
      // Validate input
      const emailValidation = AuthValidationService.validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error('Invalid email format');
      }

      // Find user
      const user = await AuthService.findUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      if (!user.hashedPassword) {
        throw new Error('Invalid credentials');
      }

      const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
      if (!passwordMatch) {
        throw new Error('Invalid credentials');
      }

      return user;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Register new user with email and password
   */
  static async register(data: SignUpData): Promise<AuthResult> {
    try {
      // Check if user already exists by email
      const existingUserByEmail = await AuthService.userExistsByEmail(data.email);
      if (existingUserByEmail) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Check if username is taken
      const existingUserByUsername = await AuthService.userExistsByUsername(data.username);
      if (existingUserByUsername) {
        return {
          success: false,
          message: 'Username already taken',
        };
      }

      // Validate password strength
      const passwordValidation = AuthValidationService.validatePassword(data.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', '),
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Determine role (first user is admin)
      const isFirstUser = await AuthService.isFirstUser();
      const role = isFirstUser ? 'ADMIN' : 'USER';

      // Create user
      const newUser = await AuthService.createUser({
        email: data.email,
        username: data.username,
        hashedPassword,
        role,
      });

      return {
        success: true,
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          image: null,
          hashedPassword,
          createdAt: newUser.createdAt,
          updatedAt: newUser.createdAt,
          settings: null,
        } as ExtendedUser,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.',
      };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Get user
      const user = await AuthService.findUserById(userId);
      if (!user || !user.hashedPassword) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verify current password
      const currentPasswordMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!currentPasswordMatch) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Validate new password
      const passwordValidation = AuthValidationService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', '),
        };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      await db.user.update({
        where: { id: userId },
        data: { hashedPassword },
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: 'Failed to change password. Please try again.',
      };
    }
  }
}
