"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Copy,
  Ellipsis,
  PenLine,
  Search,
  Shield,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { RoleFormSheet } from "@/components/configuracion/role-form-sheet"
import { deleteRoleAction, duplicateRoleAction } from "@/lib/actions/roles"
import type { RoleWithCount } from "@/lib/services/roles"

interface RolesPageClientProps {
  initialRoles: RoleWithCount[]
}

export function RolesPageClient({ initialRoles }: RolesPageClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithCount | null>(null)

  // Client-side filtering
  const filteredRoles = search.trim()
    ? initialRoles.filter((role) =>
        role.name.toLowerCase().includes(search.toLowerCase())
      )
    : initialRoles

  function handleCreate() {
    setEditingRole(null)
    setSheetOpen(true)
  }

  function handleEdit(role: RoleWithCount) {
    setEditingRole(role)
    setSheetOpen(true)
  }

  async function handleDuplicate(role: RoleWithCount) {
    try {
      await duplicateRoleAction(role.id)
      toast.success("Rol duplicado")
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error", { description: msg })
    }
  }

  async function handleDelete(role: RoleWithCount) {
    try {
      await deleteRoleAction(role.id)
      toast.success("Rol eliminado")
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error", { description: msg })
    }
  }

  return (
    <div className="flex flex-1 flex-col space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administrar roles</h1>
        <p className="text-muted-foreground">
          Creá y configurá los roles de tu organización con permisos
          específicos.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleCreate}>Nuevo rol</Button>
      </div>

      {/* Table */}
      {filteredRoles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Sin roles</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Creá un rol para asignar permisos a los colaboradores.
          </p>
          <Button onClick={handleCreate}>Crear primer rol</Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.is_system && (
                        <Badge variant="outline" className="text-xs">
                          Sistema
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role.member_count} miembro
                      {role.member_count !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {role.permissions.length} permiso
                      {role.permissions.length !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(role)}>
                          <PenLine className="size-4" />
                          {role.is_system ? "Ver permisos" : "Editar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(role)}>
                          <Copy className="size-4" />
                          Duplicar
                        </DropdownMenuItem>
                        {!role.is_system && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={role.member_count > 0}
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 className="size-4" />
                              {role.member_count > 0
                                ? "Tiene miembros asignados"
                                : "Eliminar"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet */}
      <RoleFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        role={editingRole}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
