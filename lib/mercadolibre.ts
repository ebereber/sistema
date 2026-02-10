import { supabaseAdmin } from "@/lib/supabase/admin";

const MELI_API_BASE = "https://api.mercadolibre.com";
const MELI_AUTH_URL = "https://auth.mercadolibre.com.ar/authorization";
const MELI_TOKEN_URL = `${MELI_API_BASE}/oauth/token`;

// ─── Types ────────────────────────────────────────────

export interface MeliTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export interface MeliAccount {
  id: string;
  user_id: string;
  meli_user_id: number;
  nickname: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  organization_id: string;
  price_list_id: string | null;
}

// ─── Auth URLs ────────────────────────────────────────

export function getMeliAuthUrl(redirectUri: string): string {
  const appId = process.env.MERCADOLIBRE_APP_ID;
  if (!appId) throw new Error("MERCADOLIBRE_APP_ID no configurado");

  const url = new URL(MELI_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

// ─── Token Exchange ───────────────────────────────────

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<MeliTokenResponse> {
  const response = await fetch(MELI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.MERCADOLIBRE_APP_ID,
      client_secret: process.env.MERCADOLIBRE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MeLi token exchange failed: ${response.status} ${errorBody}`,
    );
  }

  return response.json();
}

// ─── Token Refresh ────────────────────────────────────

async function refreshAccessToken(account: MeliAccount): Promise<MeliAccount> {
  const response = await fetch(MELI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.MERCADOLIBRE_APP_ID,
      client_secret: process.env.MERCADOLIBRE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MeLi token refresh failed: ${response.status} ${errorBody}`,
    );
  }

  const data: MeliTokenResponse = await response.json();

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Update tokens in DB
  await supabaseAdmin
    .from("mercadolibre_accounts")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("meli_user_id", account.meli_user_id);

  return {
    ...account,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_expires_at: expiresAt,
  };
}

// ─── Get Valid Account (auto-refresh) ─────────────────

export async function getMeliAccount(
  organizationId: string,
): Promise<MeliAccount | null> {
  const { data } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return null;

  const account = data as MeliAccount;

  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = new Date(account.token_expires_at).getTime();
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt - now < bufferMs) {
    return refreshAccessToken(account);
  }

  return account;
}

export async function getMeliAccountByUserId(
  meliUserId: number,
): Promise<MeliAccount | null> {
  const { data } = await supabaseAdmin
    .from("mercadolibre_accounts")
    .select("*")
    .eq("meli_user_id", meliUserId)
    .maybeSingle();

  if (!data) return null;

  const account = data as MeliAccount;

  const expiresAt = new Date(account.token_expires_at).getTime();
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt - now < bufferMs) {
    return refreshAccessToken(account);
  }

  return account;
}

// ─── API Call Helper ──────────────────────────────────

export async function meliApiFetch(
  account: MeliAccount,
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${MELI_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  // If unauthorized, try refreshing token once
  if (response.status === 401) {
    const refreshed = await refreshAccessToken(account);
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${refreshed.access_token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  }

  return response;
}
