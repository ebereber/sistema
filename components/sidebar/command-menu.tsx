"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ArrowRight,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Detectar OS para mostrar el shortcut correcto
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Keyboard shortcut ⌘K o Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        className="relative rounded-full w-full justify-start text-xs text-muted-foreground h-9"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Buscar...</span>
        <Badge
          variant="secondary"
          className="ml-auto hidden sm:inline-flex pointer-events-none"
        >
          {isMac ? "⌘K" : "Ctrl K"}
        </Badge>
      </Button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar acciones..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {/* Acciones rápidas */}
          <CommandGroup heading="Acciones rápidas">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/ventas/nueva"))}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Nueva venta</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/compras/nueva"))}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Nueva compra</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(() => {
                  // TODO: Abrir dialog de nueva cobranza
                  console.log("Abrir dialog nueva cobranza");
                })
              }
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Nueva cobranza</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(() => {
                  // TODO: Abrir dialog de nuevo pago
                  console.log("Abrir dialog nuevo pago");
                })
              }
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Nuevo pago</span>
            </CommandItem>
          </CommandGroup>

          {/* Navegación */}
          <CommandGroup heading="Navegación">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/ventas"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Ventas</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/clientes"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Clientes</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/cobranzas"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Cobranzas</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/presupuestos"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Presupuestos</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/productos"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Productos</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/compras"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Compras</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/configuracion"))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Configuración</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
