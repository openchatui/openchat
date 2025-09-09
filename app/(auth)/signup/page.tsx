import { signUp } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-4 p-4 rounded-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center">Create Account</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}
        
        {/* Email/Password Sign Up */}
        <form
          className="flex flex-col gap-2"
          action={async (formData) => {
            "use server";
            const res = await signUp(formData);
            if (res.success) {
              redirect("/login?message=" + encodeURIComponent("Account created successfully! Please sign in."));
            } else {
              redirect("/signup?error=" + encodeURIComponent(res.message));
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
              placeholder="Password (min 8 characters)"
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

          <Button 
            variant="outline" 
            className="w-full" 
            type="submit"
          >
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
} 