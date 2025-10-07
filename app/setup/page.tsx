import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, AuthService } from "@/lib/auth";
import { AdminSetupForm } from "@/components/setup/AdminSetupForm";
import { Button } from "@/components/ui/button";

export default async function SetupPage() {
  const [session, firstUser] = await Promise.all([
    auth(),
    AuthService.isFirstUser(),
  ])

  // If users already exist and user is logged in, redirect to home
  if (!firstUser && session) {
    redirect('/')
  }

  // If users already exist and user is not logged in, show message
  if (!firstUser && !session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
        <div className="flex flex-col gap-6 p-4 rounded-xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold">Setup Complete</h1>
          <p className="text-muted-foreground">
            The admin account has already been created. Please log in to continue.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-6 p-4 rounded-xl max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to OpenChat</h1>
          {firstUser && (
            <p className="text-muted-foreground mt-1">Setup an Admin User to get started.</p>
          )}
        </div>

        <AdminSetupForm />
      </div>
    </div>
  );
}


