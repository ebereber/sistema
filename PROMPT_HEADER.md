Necesito crear el header principal de mi aplicación POS usando Next.js 16, TypeScript y shadcn/ui, integrándose con mi sidebar existente (SidebarProvider).

## CONTEXTO

Ya tengo implementado:

- SidebarProvider con sidebar de navegación
- Sistema de rutas en app/(dashboard)
- Componentes de UI base (sidebar, buttons, etc.)

## ESTRUCTURA DE ARCHIVOS A CREAR

components/sidebar/app-header.tsx
components/sidebar/command-menu.tsx
components/sidebar/user-menu.tsx
components/sidebar/business-selector.tsx (opcional por ahora)

## INTEGRACIÓN CON LAYOUT EXISTENTE

Modificar `app/(dashboard)/layout.tsx`:

```typescript
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { AppHeader } from "@/components/sidebar/app-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumb si lo necesitas */}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

**IMPORTANTE:** El header debe ir DENTRO de SidebarInset para que funcione correctamente con el sistema de sidebar de shadcn.

## LAYOUT VISUAL DEL HEADER

┌────────────────────────────────────────────────────────────────────────────┐
│ [☰] [◇] [Separador] [🔍 Buscar... ⌘K] [💬 Escribinos] [⚙️] [LO] │
└────────────────────────────────────────────────────────────────────────────┘

**Elementos del header (izquierda a derecha):**

1. **SidebarTrigger (☰):**
   - Ya viene incluido en shadcn sidebar
   - Importar: `import { SidebarTrigger } from "@/components/ui/sidebar"`
   - No necesitas crear botón custom

2. **Separator vertical:**
   - `<Separator orientation="vertical" className="mr-2 h-4" />`

3. **Buscador (Command Menu):**
   - Input con ícono Search
   - Placeholder: "Buscar..."
   - Badge "⌘ K" o "Ctrl K" al final
   - Ancho: flex-1 max-w-md
   - onClick o shortcut ⌘K/Ctrl+K: abre Command Dialog

4. **Spacer:**
   - `<div className="flex-1" />` para empujar elementos a la derecha

5. **Botón Escribinos:**
   - Button ghost
   - Ícono MessageCircle
   - Texto "Escribinos" (oculto en mobile)
   - href: link a WhatsApp de soporte

6. **Botón Settings:**
   - Button ghost, solo ícono Settings
   - Link a /configuracion

7. **User Menu (LO):**
   - Avatar con iniciales del usuario
   - Al hacer click: abrir DropdownMenu con opciones

## COMPONENTE: app-header.tsx

```typescript
"use client"

import Link from "next/link"
import { MessageCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandMenu } from "./command-menu"
import { UserMenu } from "./user-menu"

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      {/* Sidebar Trigger */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Command Menu */}
      <div className="flex-1 max-w-md">
        <CommandMenu />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Escribinos Button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          asChild
        >

            href="https://wa.me/5493515001234" // Reemplazar con tu número
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Escribinos</span>
          </a>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          asChild
        >
          <Link href="/configuracion">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Configuración</span>
          </Link>
        </Button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  )
}
```

## COMPONENTE: command-menu.tsx

**Layout del Dialog:**
┌──────────────────────────────────────────────┐
│ 🔍 Buscar acciones... [X] │
├──────────────────────────────────────────────┤
│ Acciones rápidas │
│ │
│ 🛒 Nueva venta │
│ 📄 Nueva compra │
│ 💲 Nueva cobranza │
│ 💲 Nuevo pago │
│ │
│ Navegación │
│ │
│ → Ir a Ventas │
│ → Ir a Clientes │
│ → Ir a Cobranzas │
│ → Ir a Presupuestos │
│ → Ir a Productos │
│ → Ir a Compras │
└──────────────────────────────────────────────┘

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  ShoppingCart,
  ShoppingBag,
  DollarSign,
  CreditCard,
  ArrowRight,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Detectar OS para mostrar el shortcut correcto
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  // Keyboard shortcut ⌘K o Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground h-9"
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
              onSelect={() => runCommand(() => router.push('/ventas/nueva'))}
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Nueva venta</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/compras/nueva'))}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Nueva compra</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => {
                // TODO: Abrir dialog de nueva cobranza
                console.log('Abrir dialog nueva cobranza')
              })}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              <span>Nueva cobranza</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => {
                // TODO: Abrir dialog de nuevo pago
                console.log('Abrir dialog nuevo pago')
              })}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Nuevo pago</span>
            </CommandItem>
          </CommandGroup>

          {/* Navegación */}
          <CommandGroup heading="Navegación">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/ventas'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Ventas</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/clientes'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Clientes</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/cobranzas'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Cobranzas</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/presupuestos'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Presupuestos</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/productos'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Productos</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/compras'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Compras</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/configuracion'))}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              <span>Ir a Configuración</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

## COMPONENTE: user-menu.tsx

**Layout del Dropdown:**
┌─────────────────────────────────────┐
│ LO losdiasdecarmen │
│ losdiasdecarmen@gmail.com │
├─────────────────────────────────────┤
│ 🎨 Tema › │
├─────────────────────────────────────┤
│ 🚪 Cerrar sesión │
└─────────────────────────────────────┘

```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Palette, Sun, Moon, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function UserMenu() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [user, setUser] = useState<{
    name: string
    email: string
    initials: string
  } | null>(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Calcular iniciales del email
        const initials = user.email
          ? user.email.substring(0, 2).toUpperCase()
          : "US"

        setUser({
          name: user.email?.split('@')[0] || "Usuario",
          email: user.email || "",
          initials,
        })
      }
    }
    loadUser()
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success("Sesión cerrada correctamente")
      router.push("/login")
      router.refresh()
    } catch (error) {
      toast.error("Error al cerrar sesión")
    }
  }

  if (!user) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{user.initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Tema</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Claro</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Oscuro</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" />
              <span>Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## COMPONENTES SHADCN NECESARIOS

```bash
npx shadcn@latest add command dropdown-menu avatar badge separator
```

## CONSIDERACIONES IMPORTANTES

1. **No uses SidebarInset duplicado:** El header debe ir DENTRO del SidebarInset existente en tu layout

2. **SidebarTrigger:** Ya viene con el sistema de sidebar de shadcn, solo importarlo

3. **Supabase Client:** Asegúrate de tener el client configurado en `@/lib/supabase/client`

4. **Theme Provider:** Ya tienes ThemeSwitcher implementado, así que next-themes debería estar instalado

5. **Rutas:** Ajusta las rutas en command-menu según tu estructura real (ventas/nueva, etc.)

## MODIFICAR LAYOUT EXISTENTE

En `app/(dashboard)/layout.tsx`, la estructura debería quedar así:

```typescript
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <AppHeader /> {/* <- AQUÍ va el nuevo header */}
    <div className="flex flex-1 flex-col gap-4 p-4">
      {children}
    </div>
  </SidebarInset>
</SidebarProvider>
```

## TODOs

```typescript
// TODO: Conectar acciones de "Nueva venta", "Nueva compra" con sus dialogs/sheets reales
// TODO: Agregar búsqueda de productos/clientes en command menu
// TODO: Implementar selector de negocios (multi-tenant) si es necesario
// TODO: Agregar más shortcuts de teclado para acciones comunes
```

Comienza con la implementación del header integrándolo con tu sidebar existente.
