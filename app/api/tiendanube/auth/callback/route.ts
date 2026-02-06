import { registerWebhooksAction } from "@/lib/actions/tiendanube"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { TiendanubeTokenResponse } from "@/types/tiendanube"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const TOKEN_URL = "https://www.tiendanube.com/apps/authorize/token"
const USER_AGENT = "MiPOS (contacto@lemar.com.ar)"

/**
 * GET /api/tiendanube/auth/callback
 *
 * Receives ?code= from Tiendanube after user authorizes.
 * Exchanges the code for an access_token via POST to /apps/authorize/token.
 * Saves the store connection in tiendanube_stores.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(
      new URL("/configuracion/integraciones?error=tiendanube_no_code", process.env.NEXT_PUBLIC_APP_URL!),
    )
  }

  // Verify the user is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))
  }

  const appId = process.env.TIENDANUBE_APP_ID
  const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET

  if (!appId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/configuracion/integraciones?error=tiendanube_config_missing", process.env.NEXT_PUBLIC_APP_URL!),
    )
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        client_id: appId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "")
      console.error("Tiendanube token exchange failed:", tokenResponse.status, errorBody)
      return NextResponse.redirect(
        new URL("/configuracion/integraciones?error=tiendanube_token_failed", process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const tokenData: TiendanubeTokenResponse = await tokenResponse.json()

    // tokenData.user_id from Tiendanube is actually the store_id
    const storeId = String(tokenData.user_id)

    // Get organization_id from user
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.redirect(
        new URL("/configuracion/integraciones?error=tiendanube_no_org", process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Upsert the store connection using admin client (bypasses RLS)
    const { error: upsertError } = await supabaseAdmin
      .from("tiendanube_stores")
      .upsert(
        {
          user_id: user.id,
          store_id: storeId,
          access_token: tokenData.access_token,
          scope: tokenData.scope,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization_id: userData.organization_id,
        },
        { onConflict: "store_id" },
      )

    if (upsertError) {
      console.error("Error saving Tiendanube store:", upsertError)
      return NextResponse.redirect(
        new URL("/configuracion/integraciones?error=tiendanube_save_failed", process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Try to fetch the store name
    try {
      const storeResponse = await fetch(
        `https://api.tiendanube.com/v1/${storeId}/store`,
        {
          headers: {
            Authentication: `bearer ${tokenData.access_token}`,
            "User-Agent": USER_AGENT,
          },
        },
      )

      if (storeResponse.ok) {
        const storeData = await storeResponse.json()
        const storeName =
          storeData.name?.es || storeData.name?.pt || Object.values(storeData.name || {})[0] || null

        if (storeName) {
          await supabaseAdmin
            .from("tiendanube_stores")
            .update({ store_name: storeName as string })
            .eq("store_id", storeId)
        }
      }
    } catch {
      // Non-critical: store name fetch failed, continue
    }

    // Register webhooks automatically (non-blocking)
    try {
      await registerWebhooksAction(storeId)
      await supabaseAdmin
        .from("tiendanube_stores")
        .update({ webhooks_registered: true })
        .eq("store_id", storeId)
    } catch (webhookError) {
      console.error("Error registering webhooks:", webhookError)
      // Non-critical: webhooks can be registered manually later
    }

    return NextResponse.redirect(
      new URL("/configuracion/integraciones?tiendanube=connected", process.env.NEXT_PUBLIC_APP_URL!),
    )
  } catch (error) {
    console.error("Tiendanube OAuth error:", error)
    return NextResponse.redirect(
      new URL("/configuracion/integraciones?error=tiendanube_auth_error", process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
