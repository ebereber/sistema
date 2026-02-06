// app/(dashboard)/layout.tsx
import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { OnboardingCheck } from "@/components/onboarding/onboarding-check";
import { AppHeader } from "@/components/sidebar/app-header";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { UserProvider } from "@/lib/auth/user-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex  flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <Suspense>
        <OnboardingCheck />
      </Suspense>
    </UserProvider>
  );
}
