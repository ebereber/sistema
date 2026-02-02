"use client";

import {
  ChartNoAxesColumnDecreasing,
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
  logo: Lightbulb,
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
      { title: "Clientes", url: "/clientes", permission: "customers:read" },
      { title: "Cobranzas", url: "/cobranzas", permission: "sales:read" },
      { title: "Presupuestos", url: "/presupuestos", permission: "sales:read" },
      { title: "Turnos", url: "/turnos", permission: "sales:read" },
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
      {
        title: "Proveedores",
        url: "/proveedores",
        permission: "suppliers:read",
      },
      { title: "Pagos", url: "/pagos", permission: "purchases:read" },
    ],
  },
  {
    title: "Reportes",
    url: "/reportes",
    icon: ChartNoAxesColumnDecreasing,
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
  const { setOpen } = useSidebar();

  // Filtrar items según permisos
  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  ).map((item) => ({
    ...item,
    items: item.items?.filter(
      (sub) => !sub.permission || hasPermission(permissions, sub.permission),
    ),
  }));

  const handleMouseEnter = () => {
    if (mode === "hover" && !isDropdownOpen) setOpen(true);
  };

  const handleMouseLeave = () => {
    if (mode === "hover" && !isDropdownOpen) setOpen(false);
  };

  return (
    <Sidebar
      variant="sidebar"
      collapsible={mode === "expanded" ? "offcanvas" : "icon"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <SidebarHeader className="flex h-12 items-center justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <COMPANY.logo className="size-4" />
                </div>
                <span className="text-sm font-semibold">{COMPANY.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="gap-1 px-2 py-2">
          {filteredItems.map((item) => {
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
              <DropdownMenuRadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as SidebarMode)}
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
