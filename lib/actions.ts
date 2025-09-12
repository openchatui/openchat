import { signUpSchema } from "@/lib/schema";
import db from "@/lib/db";
import { executeAction } from "@/lib/execute";
import bcrypt from "bcryptjs";

const signUp = async (formData: FormData) => {
  return executeAction({
    actionFn: async () => {
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

      // Check if user already exists by email
      const existingUserByEmail = await db.user.findUnique({
        where: { email: validatedData.email.toLowerCase() }
      });

      if (existingUserByEmail) {
        throw new Error("User with this email already exists");
      }

      // Check if username already exists
      const existingUserByUsername = await db.user.findFirst({
        where: { name: validatedData.username }
      });

      if (existingUserByUsername) {
        throw new Error("Username already taken");
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      await db.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          name: validatedData.username,
          hashedPassword: hashedPassword,
        },
      });
    },
    successMessage: "Account created successfully",
  });
};

export { signUp };