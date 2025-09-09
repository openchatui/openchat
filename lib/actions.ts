import { signUpSchema } from "@/lib/schema";
import db from "@/lib/db";
import { executeAction } from "@/lib/execute";
import bcrypt from "bcryptjs";

const signUp = async (formData: FormData) => {
  return executeAction({
    actionFn: async () => {
      const email = formData.get("email");
      const password = formData.get("password");
      const confirmPassword = formData.get("confirmPassword");
      
      const validatedData = signUpSchema.parse({ 
        email, 
        password, 
        confirmPassword 
      });
      
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email: validatedData.email.toLowerCase() }
      });
      
      if (existingUser) {
        throw new Error("User with this email already exists");
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      
      await db.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          hashedPassword: hashedPassword,
        },
      });
    },
    successMessage: "Account created successfully",
  });
};

export { signUp };