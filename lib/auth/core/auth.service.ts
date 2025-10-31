import * as UsersRepo from '@/lib/db/users.db';
import type { ExtendedUser, UserCreation, PasswordValidation } from './auth.types';

// Core Authentication Service
export class AuthService {
  // Find user by email
  static async findUserByEmail(email: string): Promise<ExtendedUser | null> {
    try {
      return (await UsersRepo.findUserByEmail(email)) as ExtendedUser | null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  // Find user by username
  static async findUserByUsername(username: string): Promise<ExtendedUser | null> {
    try {
      return (await UsersRepo.findUserByUsername(username)) as ExtendedUser | null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  // Find user by ID
  static async findUserById(id: string): Promise<ExtendedUser | null> {
    try {
      return (await UsersRepo.findUserById(id)) as ExtendedUser | null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  // Create a new user
  static async createUser(data: {
    email: string;
    username: string;
    hashedPassword: string;
    role?: 'ADMIN' | 'USER';
  }): Promise<UserCreation> {
    const user = await UsersRepo.createUser({
      email: data.email,
      username: data.username,
      hashedPassword: data.hashedPassword,
      role: data.role,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role as 'ADMIN' | 'USER',
      createdAt: user.createdAt,
    };
  }

  // Update user's image/avatar
  static async updateUserImage(userId: string, imageUrl: string): Promise<boolean> {
    try {
      await UsersRepo.updateUserImage(userId, imageUrl);
      return true;
    } catch (error) {
      console.error('Error updating user image:', error);
      return false;
    }
  }

  // Update user's role
  static async updateUserRole(userId: string, role: 'ADMIN' | 'USER'): Promise<boolean> {
    try {
      await UsersRepo.updateUserRole(userId, role);
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  // Check if user exists by email
  static async userExistsByEmail(email: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    return user !== null;
  }

  // Check if user exists by username
  static async userExistsByUsername(username: string): Promise<boolean> {
    const user = await this.findUserByUsername(username);
    return user !== null;
  }

  // Get user count
  static async getUserCount(): Promise<number> {
    try {
      return await UsersRepo.getUserCount();
    } catch (error) {
      console.error('Error getting user count:', error);
      // Don't return 0 on error - this can cause redirect loops
      // If we can't connect to the database, throw the error
      throw new Error('Failed to connect to database');
    }
  }

  // Check if this is the first user (for admin setup)
  static async isFirstUser(): Promise<boolean> {
    try {
      const count = await this.getUserCount();
      return count === 0;
    } catch (error) {
      console.error('Error checking if first user:', error);
      // On error, assume users exist to avoid redirect loops
      // This prevents redirecting to setup when database is unavailable
      return false;
    }
  }
}
