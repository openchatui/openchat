import { signUpSchema } from "../validation/auth.validation";
import { CredentialsProvider } from "../providers/credentials.provider";
import type { AuthResult } from "./auth.types";

/**
 * Authentication Actions Service
 */
export class AuthActionsService {
  /**
   * Execute an action with proper error handling
   */
  private static async executeAction<T>(
    actionFn: () => Promise<T>,
    successMessage: string = "The action was successful"
  ): Promise<{ success: boolean; message: string; data?: T }> {
    try {
      const result = await actionFn();
      return {
        success: true,
        message: successMessage,
        data: result,
      };
    } catch (error) {
      // Handle redirect errors
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error; // Re-throw redirect errors
      }

      // Handle validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        const validationError = error as any;
        const errorMessage = validationError.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return {
          success: false,
          message: errorMessage,
        };
      }

      // Handle other errors
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }

      return {
        success: false,
        message: "An unexpected error has occurred",
      };
    }
  }

  /**
   * Sign up a new user
   */
  static async signUp(formData: FormData) {
    return this.executeAction(async () => {
      const email = formData.get("email");
      const username = formData.get("username");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");

      const validatedData = signUpSchema.parse({
        email,
        username,
        password,
        confirmPassword
      });

      const result = await CredentialsProvider.register(validatedData);
      
      if (!result.success) {
        throw new Error(result.message);
      }

      return result.user;
    }, "Account created successfully");
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    return CredentialsProvider.changePassword(userId, currentPassword, newPassword);
  }

  /**
   * Update user profile
   */
  static async updateProfile(formData: FormData) {
    return this.executeAction(async () => {
      // Implementation for profile updates
      // This would include updating name, email, etc.
      throw new Error("Profile update not yet implemented");
    }, "Profile updated successfully");
  }
}

// Export individual functions for legacy compatibility
export const signUp = AuthActionsService.signUp;
