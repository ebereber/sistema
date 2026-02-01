// app/acceso-pendiente/page.tsx
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function AccesoPendientePage() {
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
