import Link from "next/link";

import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <ShieldX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">No tenés permisos para acceder</h1>
        <p className="max-w-sm text-muted-foreground">
          No tenés los permisos necesarios para ver esta página. Contactá al
          administrador si creés que es un error.
        </p>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
