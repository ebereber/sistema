"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Ellipsis,
  Loader2,
  Mail,
  PenLine,
  RotateCcw,
  Search,
  UserX,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CollaboratorFormSheet } from "@/components/configuracion/collaborator-form-sheet";
import {
  deactivateCollaborator,
  getCollaborators,
  getPendingInvitations,
  reactivateCollaborator,
  revokeInvitation,
  type Collaborator,
  type PendingInvitation,
} from "@/lib/services/collaborators";
import { getRoles, RoleWithCount } from "@/lib/services/roles";

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [roles, setRoles] = useState<RoleWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"invite" | "edit">("invite");
  const [editingCollaborator, setEditingCollaborator] =
    useState<Collaborator | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [collabs, invites, rolesData] = await Promise.all([
        getCollaborators(search || undefined),
        getPendingInvitations(),
        getRoles(),
      ]);
      setCollaborators(collabs);
      setInvitations(invites);
      setRoles(rolesData);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar datos", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  function handleInvite() {
    setSheetMode("invite");
    setEditingCollaborator(null);
    setSheetOpen(true);
  }

  function handleEdit(collaborator: Collaborator) {
    setSheetMode("edit");
    setEditingCollaborator(collaborator);
    setSheetOpen(true);
  }

  async function handleDeactivate(collaborator: Collaborator) {
    try {
      await deactivateCollaborator(collaborator.id);
      toast.success("Colaborador desactivado");
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error", { description: msg });
    }
  }

  async function handleReactivate(collaborator: Collaborator) {
    try {
      await reactivateCollaborator(collaborator.id);
      toast.success("Colaborador reactivado");
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error", { description: msg });
    }
  }

  async function handleRevokeInvitation(invitation: PendingInvitation) {
    try {
      await revokeInvitation(invitation.id);
      toast.success("Invitación revocada");
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error", { description: msg });
    }
  }

  function formatDate(date: string) {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "hoy";
    if (diffDays === 1) return "ayer";
    if (diffDays < 30) return `hace ${diffDays} días`;

    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  }

  const isOwner = (c: Collaborator) => c.role?.is_system === true;

  return (
    <div className="flex flex-1 flex-col space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleInvite}>
            <Mail className="mr-2 size-4" />
            Invitar
          </Button>
          <Link href="/configuracion/roles">
            <Button>Administrar roles</Button>
          </Link>
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Invitaciones pendientes primero */}
              {invitations.map((inv) => (
                <TableRow key={`inv-${inv.id}`} className="bg-muted/30">
                  <TableCell>
                    <div className="font-medium text-muted-foreground">
                      {inv.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {inv.role?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger className="text-sm text-muted-foreground">
                        {formatDate(inv.created_at)}
                      </TooltipTrigger>
                      <TooltipContent>
                        {new Date(inv.created_at).toLocaleDateString("es-AR")}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-amber-600">
                      Pendiente
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
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleRevokeInvitation(inv)}
                        >
                          <X className="size-4" />
                          Revocar invitación
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}

              {/* Usuarios */}
              {collaborators.map((collab) => (
                <TableRow key={collab.id}>
                  <TableCell>
                    <div className="font-medium">
                      {collab.name || collab.email.split("@")[0]}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {collab.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    {isOwner(collab) ? (
                      <Badge variant="default">{collab.role?.name}</Badge>
                    ) : (
                      <span className="text-sm">
                        {collab.role?.name || "Sin rol"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger className="text-sm text-muted-foreground">
                        {formatDate(collab.created_at)}
                      </TooltipTrigger>
                      <TooltipContent>
                        {new Date(collab.created_at).toLocaleDateString(
                          "es-AR",
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={collab.active ? "secondary" : "outline"}
                      className={
                        !collab.active ? "text-muted-foreground" : undefined
                      }
                    >
                      {collab.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!isOwner(collab) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(collab)}>
                            <PenLine className="size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {collab.active ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeactivate(collab)}
                            >
                              <UserX className="size-4" />
                              Desactivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleReactivate(collab)}
                            >
                              <RotateCcw className="size-4" />
                              Reactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {collaborators.length === 0 && invitations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No se encontraron colaboradores.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet */}
      <CollaboratorFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        collaborator={editingCollaborator}
        roles={roles}
        onSuccess={fetchData}
      />
    </div>
  );
}
