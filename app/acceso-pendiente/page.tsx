import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AccesoPendientePage() {
  // If user is not even logged in, send to login
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Check if the user already has an active account with org
  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("active, organization_id")
    .eq("id", authUser.id)
    .single();

  if (dbUser?.active && dbUser.organization_id) {
    redirect("/");
  }

  if (dbUser?.active && !dbUser.organization_id) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <ShieldX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Acceso pendiente</h1>
        <p className="max-w-sm text-muted-foreground">
          Tu cuenta fue creada pero todavía no tiene acceso al sistema. Contactá
          al administrador para que te asigne un rol.
        </p>
        <Link href="/login">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
