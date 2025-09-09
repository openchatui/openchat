import { Database } from "@/database.types";
import { createClient } from "@/utils/supabase/server";
import { isAuthApiError } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  
  const isNgrok = host?.includes("ngrok-free.app");
  const isVercel = host?.includes("vercel.app");
  const protocol = isNgrok || isVercel ? "https" : "http";
  
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  const teamInviteCode = requestUrl.searchParams.get("teamInviteCode");
  const returnTo = requestUrl.searchParams.get("returnTo");

  if (error || error_description) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error_description || "Something went wrong")}`,
        requestUrl.origin
      )
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error(
          "[login] [session] [500] Error exchanging code for session: ",
          sessionError
        );
        return NextResponse.redirect(
          `${protocol}://${host}/login/failed?err=SessionError`
        );
      }

      if (!session) {
        console.error("[login] [session] [500] No session returned");
        return NextResponse.redirect(
          `${protocol}://${host}/login/failed?err=NoSession`
        );
      }
    } catch (error) {
      if (isAuthApiError(error)) {
        console.error(
          "[login] [session] [500] Auth API Error: ",
          error
        );
        return NextResponse.redirect(
          `${protocol}://${host}/login/failed?err=AuthApiError`
        );
      } else {
        console.error("[login] [session] [500] Unexpected error: ", error);
        return NextResponse.redirect(
          `${protocol}://${host}/login/failed?err=500`
        );
      }
    }
  }

  // Determine where to redirect after successful authentication
  let redirectTo = "/dashboard";
  
  if (teamInviteCode) {
    redirectTo = `/dashboard/teams/generate/${teamInviteCode}`;
  } else if (returnTo) {
    // Only allow redirects to internal paths
    const returnToUrl = new URL(returnTo, requestUrl.origin);
    if (returnToUrl.origin === requestUrl.origin) {
      redirectTo = returnToUrl.pathname + returnToUrl.search;
    }
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}

