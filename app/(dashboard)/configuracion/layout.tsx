"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Building2,
  DollarSign,
  FolderOpen,
  MapPin,
  Menu,
  Settings,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { id: "organizacion", label: "Organización", icon: Building2 },
  { id: "preferencias", label: "Preferencias", icon: Settings },
  { id: "puntos-de-venta", label: "Puntos de Venta", icon: MapPin },
  { id: "ubicaciones", label: "Ubicaciones", icon: Store },
  { id: "medios-pago", label: "Medios de Pago", icon: Wallet },
  { id: "categorias", label: "Categorías", icon: FolderOpen },
  { id: "listas-precios", label: "Listas de Precios", icon: DollarSign },
  { id: "colaboradores", label: "Colaboradores", icon: Users },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex  flex-col   text-sidebar-foreground">
      <div className="flex items-center justify-between p-6">
        <h2 className="pb-4 font-semibold text-lg">Configuración</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-4 ">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const href =
            item.id === "organizacion"
              ? "/configuracion"
              : `/configuracion/${item.id}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.id}
              href={href}
              onClick={onClose}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = usePathname();

  const currentSection = pathname.split("/").pop() || "organizacion";
  const currentMenuItem = menuItems.find((item) =>
    pathname === "/configuracion"
      ? item.id === "organizacion"
      : item.id === currentSection,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile Header */}
      <div className="border-b border-border py-4 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex w-full  items-center gap-3 rounded-lg border border-input px-3 py-2 bg-background">
              <Menu className="h-4 w-4" />
              <span className="text-sm">{currentMenuItem?.label}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-70 p-0">
            <SidebarContent onClose={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden w-70   lg:block">
          <div className="sticky top-16 h-[calc(100vh-5rem)]  overflow-y-auto">
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
