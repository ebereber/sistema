import { exchangeCodeForToken } from "@/lib/mercadolibre";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * GET /api/mercadolibre/auth/callback
 *
 * Receives ?code= from MercadoLibre after user authorizes.
 * Exchanges the code for access_token + refresh_token.
 * Saves the account connection in mercadolibre_accounts.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/configuracion/integraciones?error=meli_no_code",
        process.env.NEXT_PUBLIC_APP_URL!,
      ),
    );
  }

  // Verify the user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL!),
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadolibre/auth/callback`;

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code, redirectUri);

    const meliUserId = tokenData.user_id;
    const expiresAt = new Date(
      Date.now() + tokenData.expires_in * 1000,
    ).toISOString();

    // Get organization_id from user
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.redirect(
        new URL(
          "/configuracion/integraciones?error=meli_no_org",
          process.env.NEXT_PUBLIC_APP_URL!,
        ),
      );
    }

    // Upsert the account connection
    const { error: upsertError } = await supabaseAdmin
      .from("mercadolibre_accounts")
      .upsert(
        {
          user_id: user.id,
          meli_user_id: meliUserId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          organization_id: userData.organization_id,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "meli_user_id" },
      );

    if (upsertError) {
      console.error("Error saving MeLi account:", upsertError);
      return NextResponse.redirect(
        new URL(
          "/configuracion/integraciones?error=meli_save_failed",
          process.env.NEXT_PUBLIC_APP_URL!,
        ),
      );
    }

    // Fetch the user's nickname (non-blocking)
    try {
      const account = {
        access_token: tokenData.access_token,
        meli_user_id: meliUserId,
      };

      const meResponse = await fetch(`https://api.mercadolibre.com/users/me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        if (meData.nickname) {
          await supabaseAdmin
            .from("mercadolibre_accounts")
            .update({ nickname: meData.nickname })
            .eq("meli_user_id", meliUserId);
        }
      }
    } catch {
      // Non-critical
    }

    return NextResponse.redirect(
      new URL(
        "/configuracion/integraciones?mercadolibre=connected",
        process.env.NEXT_PUBLIC_APP_URL!,
      ),
    );
  } catch (error) {
    console.error("MeLi OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        "/configuracion/integraciones?error=meli_auth_error",
        process.env.NEXT_PUBLIC_APP_URL!,
      ),
    );
  }
}
