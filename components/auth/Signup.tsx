import { signUp } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";
import Link from "next/link";

export const Signup = () => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-4 p-4 rounded-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center">Create Account</h1>
        
        {/* Email/Password Sign Up */}
        <form
          className="flex flex-col gap-2"
          action={async (formData) => {
            "use server";
            const res = await signUp(formData);
            if (res.success) {
              redirect("/login");
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <Input
              name="email"
              placeholder="Email"
              type="email"
              required
              autoComplete="email"
            />
            <Input
              name="password"
              placeholder="Password"
              type="password"
              required
              autoComplete="new-password"
            />
            <Input
              name="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          <Button variant="outline" className="w-full" type="submit">
            Create Account
          </Button>
        </form>
        
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}; 