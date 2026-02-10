import { getMeliAuthUrl } from "@/lib/mercadolibre";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/mercadolibre/auth
 *
 * Redirects the user to MercadoLibre to authorize the app.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL!),
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadolibre/auth/callback`;

  try {
    const authUrl = getMeliAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("MeLi auth error:", error);
    return NextResponse.redirect(
      new URL(
        "/configuracion/integraciones?error=meli_config_missing",
        process.env.NEXT_PUBLIC_APP_URL!,
      ),
    );
  }
}
