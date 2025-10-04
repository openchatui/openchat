import Link from "next/link";
import { auth, AuthService } from "@/lib/auth";
import { AdminSetupForm } from "@/components/setup/AdminSetupForm";
import { OpenAIKeyForm } from "@/components/setup/OpenAIKeyForm";

export default async function SetupPage() {
  const [session, firstUser] = await Promise.all([
    auth(),
    AuthService.isFirstUser(),
  ])

  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-8">
      <div className="flex flex-col gap-6 p-4 rounded-xl max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to OpenChat</h1>
          {firstUser && (
            <p className="text-muted-foreground mt-1">Setup an Admin User to get started.</p>
          )}
          {!firstUser && session && (
            <p className="text-muted-foreground mt-1">Add your provider key to start chatting.</p>
          )}
        </div>

        {firstUser ? (
          <>
            <AdminSetupForm />
          </>
        ) : (
          <>
            <div className="text-left">
              <h2 className="text-lg font-semibold">OpenAI Setup</h2>
              <p className="text-sm text-muted-foreground">Provide your API key. You can change this later in Admin → Connections.</p>
            </div>
            {session ? <OpenAIKeyForm /> : (
              <div className="text-center text-sm">
                Please <Link href="/login" className="text-primary hover:underline">sign in</Link> to add your provider key.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


