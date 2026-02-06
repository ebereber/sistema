import { redirect } from "next/navigation";

import { getServerUser } from "@/lib/auth/get-server-user";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  // 1. Check if user is authenticated at all (Supabase Auth)
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Get full user data from public.users
  const user = await getServerUser();

  // user is null when !data.active → they should see /acceso-pendiente
  if (!user) {
    redirect("/acceso-pendiente");
  }

  // 3. If user already has an org with onboarding completed → go to dashboard
  if (user.organization_id) {
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("onboarding_completed")
      .eq("id", user.organization_id)
      .single();

    if (org?.onboarding_completed) {
      redirect("/");
    }
  }

  // 4. User needs onboarding → show form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Configurá tu organización</h1>
          <p className="text-muted-foreground">
            Completá los datos de tu empresa para empezar a usar el sistema.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
