import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/tiendanube/auth
 *
 * Redirects the user to Tiendanube to authorize the app.
 * URL: https://www.tiendanube.com/apps/{app_id}/authorize
 * NOTE: Do NOT use /apps/authorize/token here (that's for the POST token exchange).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL!))
  }

  const appId = process.env.TIENDANUBE_APP_ID
  if (!appId) {
    return NextResponse.json(
      { error: "TIENDANUBE_APP_ID no configurado" },
      { status: 500 },
    )
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/tiendanube/auth/callback`

  const authUrl = new URL(`https://www.tiendanube.com/apps/${appId}/authorize`)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", appId)
  authUrl.searchParams.set("redirect_uri", redirectUri)

  return NextResponse.redirect(authUrl.toString())
}
