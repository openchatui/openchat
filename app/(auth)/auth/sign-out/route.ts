import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  
  const isNgrok = host?.includes("ngrok-free.app");
  const isVercel = host?.includes("vercel.app");
  const protocol = isNgrok || isVercel ? "https" : "http";
  
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[sign-out] Error signing out:", error);
    // Continue with redirect even if there's an error
  }

  return NextResponse.redirect(`${protocol}://${host}/`, {
    // a 301 status is required to redirect from a POST to a GET route
    status: 301,
  });
}
