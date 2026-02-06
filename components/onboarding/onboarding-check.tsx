import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OnboardingDialog } from "./onboarding-dialog";

export async function OnboardingCheck() {
  const user = await getServerUser();
  if (!user) return null;

  // User has no organization assigned
  if (!user.organization_id) {
    return <OnboardingDialog />;
  }

  // Check if onboarding is completed
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("onboarding_completed")
    .eq("id", user.organization_id)
    .single();

  if (!org || org.onboarding_completed === false) {
    return <OnboardingDialog />;
  }

  return null;
}
