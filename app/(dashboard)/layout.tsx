// app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AppHeader } from "@/components/sidebar/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { UserProvider } from "@/lib/auth/user-provider";
import { getServerUser } from "@/lib/auth/get-server-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Check Supabase Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Get public.users row
  const user = await getServerUser();

  if (!user) {
    // user exists in auth but not active in public.users
    redirect("/acceso-pendiente");
  }

  // 3. Check organization
  if (!user.organization_id) {
    redirect("/onboarding");
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("onboarding_completed")
    .eq("id", user.organization_id)
    .single();

  if (!org || !org.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <UserProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex  flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </UserProvider>
  );
}
