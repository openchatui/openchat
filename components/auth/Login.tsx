import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAction } from "@/lib/execute";
import { signIn } from "@/lib/auth";
import Link from "next/link";

export const Login = () => {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-4 p-4 rounded-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center">Login</h1>
        
        {/* <Button variant={"outline"} className="font-semibold">
          Continue with Google
        </Button>
        
        <Button variant={"outline"} className="font-semibold">
          Continue with GitHub
        </Button>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div> */}

        {/* Email/Password Sign In */}
        <form
          className="flex flex-col gap-2"
          action={async (formData) => {
            "use server";
            await executeAction({
              actionFn: async () => {
                await signIn("credentials", formData);
              },
            });
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
              autoComplete="current-password"
            />
          </div>

          <Button variant="outline" className="w-full" type="submit">
            Sign In
          </Button>
          
          <div className="mt-2 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/90">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OR = () => {
  return (
    <div className="flex items-center my-1">
      <div className="border-b flex-grow mr-2 opacity-50" />
      <span className="text-sm opacity-50">OR</span>
      <div className="border-b flex-grow ml-2 opacity-50" />
    </div>
  );
};
