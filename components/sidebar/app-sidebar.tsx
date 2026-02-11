"use client";

import {
  ChartNoAxesColumnDecreasing,
  ChessRook,
  ChevronRight,
  Import,
  Package,
  PanelLeft,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { hasPermission } from "@/lib/auth/permissions";
import { useCurrentUser } from "@/lib/auth/user-provider";

const COMPANY = {
  name: "Lemar",
  logo: ChessRook,
};

const NAV_ITEMS = [
  {
    title: "Nueva Venta",
    icon: Plus,
    url: "/ventas/nueva",
    permission: "sales:write",
  },
  {
    title: "Ventas",
    url: "/ventas",
    icon: ShoppingCart,
    permission: "sales:read",
    items: [
      { title: "Cobranzas", url: "/cobranzas", permission: "sales:read" },
      { title: "Presupuestos", url: "/presupuestos", permission: "sales:read" },
      { title: "Turnos", url: "/turnos", permission: "sales:read" },
    ],
  },
  {
    title: "Compras",
    url: "/compras",
    icon: ShoppingBag,
    permission: "purchases:read",
    items: [
      {
        title: "Órdenes de Compra",
        url: "/ordenes",
        permission: "orders:read",
      },
      { title: "Pagos", url: "/pagos", permission: "purchases:read" },
    ],
  },
  {
    title: "Productos",
    url: "/productos",
    icon: Package,
    permission: "products:read",
    items: [
      {
        title: "Transferencias",
        url: "/transferencias",
        permission: "products:read",
      },
      {
        title: "Inventario",
        url: "/inventario",
        permission: "products:read",
      },
    ],
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    permission: "customers:read",
  },
  {
    title: "Proveedores",
    url: "/proveedores",
    icon: Truck,
    permission: "suppliers:read",
  },
  {
    title: "Tesorería",
    url: "/tesoreria",
    icon: PanelLeft,
    permission: "treasury:read",
    items: [
      {
        title: "Movimientos",
        url: "/movimientos",
        permission: "treasury:read",
      },
    ],
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: ChartNoAxesColumnDecreasing,
    permission: "settings:write",
  },

  {
    title: "Importar",
    url: "/importar",
    icon: Import,
    permission: "settings:write",
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: Settings,
    permission: "settings:write",
  },
];

type SidebarMode = "expanded" | "collapsed" | "hover";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { permissions } = useCurrentUser();
  const [mode, setMode] = React.useState<SidebarMode>("hover");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [openSection, setOpenSection] = React.useState<string | null>(null);
  const { setOpen } = useSidebar();

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  ).map((item) => ({
    ...item,
    items: item.items?.filter(
      (sub) => !sub.permission || hasPermission(permissions, sub.permission),
    ),
  }));
  const isHoverMode = mode === "hover";

  const hoverTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (isHoverMode && !isDropdownOpen) {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = null;
      }
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (isHoverMode && !isDropdownOpen) {
      hoverTimeout.current = setTimeout(() => {
        setOpen(false); // Cierra el sidebar principal
        setOpenSection(null); // <--- ESTO cerrará cualquier ítem interno abierto
      }, 150);
    }
  };

  React.useEffect(() => {
    document.body.classList.toggle("sidebar-hover-mode", isHoverMode);
    return () => {
      document.body.classList.remove("sidebar-hover-mode");
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, [isHoverMode]);

  return (
    <Sidebar
      variant="sidebar"
      collapsible={mode === "expanded" ? "offcanvas" : "icon"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
      className="z-30"
    >
      <SidebarHeader className="flex h-12  items-center justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <COMPANY.logo className="size-4" />

                {/*  <span className="text-sm font-semibold">{COMPANY.name}</span> */}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="gap-1 px-2 py-2">
          {filteredItems.map((item) => {
            const hasItems = item.items && item.items.length > 0;
            const isChildActive = item.items?.some((sub) =>
              pathname.startsWith(sub.url),
            );
            const isParentActive = pathname === item.url;
            const isActive = isParentActive || isChildActive;

            if (hasItems) {
              return (
                <Collapsible
                  key={item.title}
                  open={openSection === item.title}
                  onOpenChange={(open) =>
                    setOpenSection(open ? item.title : null)
                  }
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className="pr-1"
                    >
                      <Link
                        href={item.url}
                        className="flex flex-1 items-center gap-2"
                      >
                        {item.icon && <item.icon className="size-4" />}
                        <span>{item.title}</span>
                      </Link>
                      <CollapsibleTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          className="rounded-sm p-1 hover:bg-sidebar-accent"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.currentTarget.click();
                            }
                          }}
                        >
                          <ChevronRight className="size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </span>
                      </CollapsibleTrigger>
                    </SidebarMenuButton>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname.startsWith(subItem.url)}
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
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(v) => {
                  const newMode = v as SidebarMode;
                  setMode(newMode);
                  if (newMode === "expanded") setOpen(true);
                  if (newMode === "collapsed" || newMode === "hover") {
                    setOpen(false);
                    setIsHovered(false);
                    setOpenSection(null); // Asegura que se cierren al cambiar de modo
                  }
                }}
              >
                <DropdownMenuRadioItem
                  value="expanded"
                  onClick={() => setOpen(true)}
                  className="text-xs"
                >
                  Expandido
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="collapsed"
                  onClick={() => setOpen(false)}
                  className="text-xs"
                >
                  Contraído
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="hover"
                  onClick={() => setOpen(false)}
                  className="text-xs"
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
