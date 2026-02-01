"use client";

import {
  ChevronRight,
  Lightbulb,
  Package,
  PanelLeft,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { DropdownMenuLabel } from "@radix-ui/react-dropdown-menu";
import { ThemeSwitcher } from "../theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const data = {
  company: {
    name: "Lemar",
    logo: Lightbulb,
  },
  navItems: [
    {
      title: "Nueva Venta",
      icon: Plus,
      url: "/ventas/nueva",
    },
    {
      title: "Ventas",
      url: "/ventas",
      icon: ShoppingCart,
      items: [
        { title: "Clientes", url: "/clientes" },
        { title: "Cobranzas", url: "/cobranzas" },
        { title: "Presupuestos", url: "/presupuestos" },
        { title: "Turnos", url: "/turnos" },
      ],
    },
    {
      title: "Productos",
      url: "/productos",
      icon: Package,
      items: [{ title: "Transferencias", url: "/transferencias" }],
    },
    {
      title: "Compras",
      url: "/compras",
      icon: ShoppingBag,
      items: [
        { title: "Órdenes de Compra", url: "/ordenes" },
        { title: "Proveedores", url: "/proveedores" },
        { title: "Pagos", url: "/pagos" },
      ],
    },
    {
      title: "Configuración",
      url: "/configuracion",
      icon: Settings,
    },
  ],
};

type SidebarMode = "expanded" | "collapsed" | "hover";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [mode, setMode] = React.useState<SidebarMode>("hover");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const { setOpen, open } = useSidebar();

  // Control del Hover - MEJORADO para prevenir el glitch
  const handleMouseEnter = () => {
    // Solo abre automáticamente si está en modo hover Y el dropdown NO está abierto
    if (mode === "hover" && !isDropdownOpen) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    // Solo cierra automáticamente si está en modo hover Y el dropdown NO está abierto
    if (mode === "hover" && !isDropdownOpen) {
      setOpen(false);
    }
  };

  return (
    <Sidebar
      variant={"sidebar"}
      collapsible={mode === "expanded" ? "offcanvas" : "icon"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <SidebarHeader className="border-b h-12 flex items-center justify-center border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <data.company.logo className="size-4" />
                </div>
                <span className="text-sm font-semibold">
                  {data.company.name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="gap-1 px-2 py-2">
          {data.navItems.map((item) => {
            const hasItems = item.items && item.items.length > 0;
            const isChildActive = item.items?.some(
              (sub) => pathname === sub.url,
            );
            const isParentActive = pathname === item.url;

            if (hasItems) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isChildActive || isParentActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isParentActive || isChildActive}
                      >
                        {item.icon && <item.icon className="size-4" />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === subItem.url}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isParentActive}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <ThemeSwitcher />
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="default" className="w-fit">
              <PanelLeft />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
                Control lateral
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Usamos RadioGroup para manejar el punto automáticamente */}
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as SidebarMode)}
              >
                <DropdownMenuRadioItem
                  value="expanded"
                  onClick={() => setOpen(true)}
                  className="text-xs flex items-center justify-between"
                >
                  Expandido
                </DropdownMenuRadioItem>

                <DropdownMenuRadioItem
                  value="collapsed"
                  onClick={() => setOpen(false)}
                  className="text-xs flex items-center justify-between"
                >
                  Contraído
                </DropdownMenuRadioItem>

                <DropdownMenuRadioItem
                  value="hover"
                  onClick={() => setOpen(false)}
                  className="text-xs flex items-center justify-between"
                >
                  Expandir al pasar el mouse
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/* const data = {
  company: {
    name: "La Pyme",
    logo: Sparkles,
  },
  navItems: [
    {
      title: "Nueva Venta",
      icon: Plus,
      isButton: true,
      shortcut: "V",
    },
    {
      title: "Dashboard",
      url: "#",
      icon: Clock,
    },
    {
      title: "Chat",
      url: "#",
      icon: MessageSquare,
    },
    {
      title: "Ventas",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Clientes",
          url: "#",
        },
        {
          title: "Cobranzas",
          url: "#",
        },
        {
          title: "Presupuestos",
          url: "#",
        },
        {
          title: "Turnos",
          url: "#",
        },
      ],
    },
    {
      title: "Productos",
      url: "#",
      icon: Package,
    },
    {
      title: "Compras",
      url: "#",
      icon: ShoppingBag,
      items: [],
    },
    {
      title: "Tesorería",
      url: "#",
      icon: Landmark,
      items: [],
    },
    {
      title: "Importar",
      url: "#",
      icon: Upload,
    },
    {
      title: "Reportes",
      url: "#",
      icon: BarChart3,
    },
  ],
} */
