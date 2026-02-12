"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createRoleAction, updateRoleAction } from "@/lib/actions/roles";
import {
  PERMISSION_MODULES,
  SPECIAL_ACTIONS_LIST,
  STANDALONE_PERMISSIONS,
  type RoleWithCount,
} from "@/lib/services/roles";

interface RoleFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleWithCount | null;
  onSuccess: () => void;
}

export function RoleFormSheet({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [specialActions, setSpecialActions] = useState<Set<string>>(new Set());

  const isEdit = !!role;
  const isSystem = role?.is_system ?? false;

  useEffect(() => {
    if (!open) return;

    if (role) {
      setName(role.name);
      setPermissions(new Set(role.permissions));
      setSpecialActions(new Set(role.special_actions));
    } else {
      setName("");
      setPermissions(new Set());
      setSpecialActions(new Set());
    }
  }, [open, role]);

  function togglePermission(perm: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
        // Si quito read, quitar write y export del mismo módulo
        if (perm.endsWith(":read")) {
          const mod = perm.split(":")[0];
          next.delete(`${mod}:write`);
          next.delete(`${mod}:export`);
        }
      } else {
        next.add(perm);
      }
      return next;
    });
  }

  function toggleSpecialAction(action: string) {
    setSpecialActions((prev) => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  }

  function toggleAllColumn(action: "read" | "write" | "export") {
    setPermissions((prev) => {
      const next = new Set(prev);
      const allHave = PERMISSION_MODULES.every((mod) =>
        next.has(`${mod.key}:${action}`),
      );

      PERMISSION_MODULES.forEach((mod) => {
        if (allHave) {
          next.delete(`${mod.key}:${action}`);
          if (action === "read") {
            next.delete(`${mod.key}:write`);
            next.delete(`${mod.key}:export`);
          }
        } else {
          if (action === "read") {
            next.add(`${mod.key}:read`);
          } else if (next.has(`${mod.key}:read`)) {
            next.add(`${mod.key}:${action}`);
          }
        }
      });

      return next;
    });
  }

  function isAllChecked(action: "read" | "write" | "export") {
    return PERMISSION_MODULES.every((mod) =>
      permissions.has(`${mod.key}:${action}`),
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Ingresá el nombre del rol");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: name.trim(),
        permissions: [...permissions],
        special_actions: [...specialActions],
      };

      if (isEdit && role) {
        await updateRoleAction(role.id, data);
        toast.success("Rol actualizado");
      } else {
        await createRoleAction(data);
        toast.success("Rol creado");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-11/12 flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar rol" : "Crear rol"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modificá el nombre y los permisos del rol."
              : "Definí un nuevo rol con los permisos necesarios."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-2">
          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre del rol *</Label>
            <Input
              placeholder="Ej: Vendedor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading || isSystem}
              autoFocus
            />
            {isSystem && (
              <p className="text-xs text-muted-foreground">
                Los roles del sistema no se pueden renombrar.
              </p>
            )}
          </div>

          <Separator />

          {/* Grilla de permisos */}
          <div className="space-y-3">
            <Label>Permisos por módulo</Label>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-full">Módulo</TableHead>
                    <TableHead className="w-16 text-center">
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs"
                        onClick={() => { if (!(isLoading || isSystem)) toggleAllColumn("read"); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!(isLoading || isSystem)) toggleAllColumn("read"); } }}
                      >
                        <Checkbox
                          checked={isAllChecked("read")}
                          className="pointer-events-none"
                          tabIndex={-1}
                          disabled={isLoading || isSystem}
                        />
                        Ver
                      </div>
                    </TableHead>
                    <TableHead className="w-16 text-center">
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs"
                        onClick={() => { if (!(isLoading || isSystem)) toggleAllColumn("write"); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!(isLoading || isSystem)) toggleAllColumn("write"); } }}
                      >
                        <Checkbox
                          checked={isAllChecked("write")}
                          className="pointer-events-none"
                          tabIndex={-1}
                          disabled={isLoading || isSystem}
                        />
                        Editar
                      </div>
                    </TableHead>
                    <TableHead className="w-16 text-center">
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex w-full cursor-pointer items-center justify-center gap-1 text-xs"
                        onClick={() => { if (!(isLoading || isSystem)) toggleAllColumn("export"); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!(isLoading || isSystem)) toggleAllColumn("export"); } }}
                      >
                        <Checkbox
                          checked={isAllChecked("export")}
                          className="pointer-events-none"
                          tabIndex={-1}
                          disabled={isLoading || isSystem}
                        />
                        Exportar
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MODULES.map((mod) => (
                    <TableRow key={mod.key}>
                      <TableCell className="font-medium">{mod.label}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissions.has(`${mod.key}:read`)}
                          onCheckedChange={() =>
                            togglePermission(`${mod.key}:read`)
                          }
                          disabled={isLoading || isSystem}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissions.has(`${mod.key}:write`)}
                          onCheckedChange={() =>
                            togglePermission(`${mod.key}:write`)
                          }
                          disabled={
                            isLoading ||
                            isSystem ||
                            !permissions.has(`${mod.key}:read`)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={permissions.has(`${mod.key}:export`)}
                          onCheckedChange={() =>
                            togglePermission(`${mod.key}:export`)
                          }
                          disabled={
                            isLoading ||
                            isSystem ||
                            !permissions.has(`${mod.key}:read`)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Permisos standalone */}
          <div className="space-y-3">
            <Label>Otros permisos</Label>
            <div className="space-y-3 pl-1">
              {STANDALONE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    checked={permissions.has(perm.key)}
                    onCheckedChange={() => togglePermission(perm.key)}
                    disabled={isLoading || isSystem}
                  />
                  <span className="text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Acciones especiales */}
          <div className="space-y-3">
            <Label>Acciones especiales</Label>
            <div className="space-y-3 pl-1">
              {SPECIAL_ACTIONS_LIST.map((action) => (
                <label
                  key={action.key}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <Checkbox
                    checked={specialActions.has(action.key)}
                    onCheckedChange={() => toggleSpecialAction(action.key)}
                    disabled={isLoading || isSystem}
                  />
                  <span className="text-sm">{action.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isSystem}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear rol"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
