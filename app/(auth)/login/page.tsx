import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { executeAction } from "@/lib/auth/execute";
import { auth, signIn } from "@/lib/auth/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const session = await auth();
  if (session) redirect("/");

  const { message } = await searchParams;

  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-4 p-4 rounded-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center">Login</h1>
        
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
            {decodeURIComponent(message)}
          </div>
        )}
        
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
          <div className="flex flex-col gap-2">
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

          <Button variant="outline" className="w-full mt-4" type="submit">
            Sign In
          </Button>
          
          <div className="text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/90">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
