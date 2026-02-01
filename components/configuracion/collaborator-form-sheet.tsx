"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getLocationsWithRegisters,
  inviteCollaborator,
  updateCollaborator,
  type Collaborator,
  type LocationWithRegisters,
} from "@/lib/services/collaborators";
import { type RoleWithCount } from "@/lib/services/roles";

interface CollaboratorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "invite" | "edit";
  collaborator?: Collaborator | null;
  roles: RoleWithCount[];
  onSuccess: () => void;
}

export function CollaboratorFormSheet({
  open,
  onOpenChange,
  mode,
  collaborator,
  roles,
  onSuccess,
}: CollaboratorFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState<LocationWithRegisters[]>([]);

  // Form fields
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [visibility, setVisibility] = useState("assigned_locations");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [commission, setCommission] = useState("0");
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(
    new Set(),
  );
  const [selectedRegisters, setSelectedRegisters] = useState<Set<string>>(
    new Set(),
  );

  // Cargar ubicaciones
  useEffect(() => {
    if (!open) return;
    getLocationsWithRegisters()
      .then(setLocations)
      .catch(() => toast.error("Error al cargar ubicaciones"));
  }, [open]);

  // Resetear form
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && collaborator) {
      setEmail(collaborator.email);
      setRoleId(collaborator.role_id || "");
      setVisibility(collaborator.data_visibility_scope);
      setMaxDiscount(String(collaborator.max_discount_percentage));
      setCommission(String(collaborator.commission_percentage));
      setSelectedLocations(new Set(collaborator.location_ids));
      setSelectedRegisters(new Set(collaborator.cash_register_ids));
    } else {
      setEmail("");
      setRoleId(roles.find((r) => !r.is_system)?.id || "");
      setVisibility("assigned_locations");
      setMaxDiscount("0");
      setCommission("0");
      setSelectedLocations(new Set());
      setSelectedRegisters(new Set());
    }
  }, [open, mode, collaborator, roles]);

  function toggleLocation(id: string) {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // También quitar las cajas de esta ubicación
        const loc = locations.find((l) => l.id === id);
        loc?.cash_registers.forEach((cr) => {
          setSelectedRegisters((p) => {
            const n = new Set(p);
            n.delete(cr.id);
            return n;
          });
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleRegister(id: string) {
    setSelectedRegisters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllRegisters() {
    const all = locations.flatMap((l) => l.cash_registers.map((cr) => cr.id));
    setSelectedRegisters(new Set(all));
    setSelectedLocations(new Set(locations.map((l) => l.id)));
  }

  async function handleSubmit() {
    if (mode === "invite" && !email.trim()) {
      toast.error("Ingresá el email del colaborador");
      return;
    }
    if (!roleId) {
      toast.error("Seleccioná un rol");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        role_id: roleId,
        data_visibility_scope: visibility,
        max_discount_percentage: parseFloat(maxDiscount) || 0,
        commission_percentage: parseFloat(commission) || 0,
        location_ids: [...selectedLocations],
        cash_register_ids: [...selectedRegisters],
      };

      if (mode === "invite") {
        await inviteCollaborator({
          ...data,
          email: email.trim().toLowerCase(),
        });
        toast.success("Invitación creada", {
          description: "El colaborador debe registrarse con el email indicado.",
        });
      } else if (collaborator) {
        await updateCollaborator(collaborator.id, data);
        toast.success("Colaborador actualizado");
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

  // Filtrar roles (no mostrar Dueño para invitar)
  const availableRoles =
    mode === "invite" ? roles.filter((r) => !r.is_system) : roles;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-11/12 flex-col overflow-y-auto sm:max-w-[550px]">
        <SheetHeader>
          <SheetTitle>
            {mode === "invite" ? "Invitar colaborador" : "Editar colaborador"}
          </SheetTitle>
          <SheetDescription>
            {mode === "invite"
              ? "Configurá los permisos y accesos del nuevo colaborador."
              : "Modificá la configuración del colaborador."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-2">
          {/* Email */}
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="colaborador@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || mode === "edit"}
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label>Rol *</Label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un rol" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Ubicaciones y Cajas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Acceso a ubicaciones y cajas</Label>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={selectAllRegisters}
              >
                Seleccionar todo
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border p-2">
              {locations.map((location) => (
                <div key={location.id} className="space-y-1">
                  {/* Ubicación */}
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-muted/50"
                    htmlFor={`loc-${location.id}`}
                  >
                    <Checkbox
                      id={`loc-${location.id}`}
                      checked={selectedLocations.has(location.id)}
                      onCheckedChange={() => toggleLocation(location.id)}
                      disabled={isLoading}
                    />
                    <span className="text-sm font-medium">
                      {location.name}
                      {location.is_main && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (principal)
                        </span>
                      )}
                    </span>
                  </label>

                  {/* Cajas de esta ubicación */}
                  {location.cash_registers.length > 0 && (
                    <div className="mx-3.5 mb-1 space-y-0.5 border-l border-border px-2.5">
                      {location.cash_registers.map((cr) => (
                        <label
                          key={cr.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-muted/50"
                          htmlFor={`cr-${cr.id}`}
                        >
                          <Checkbox
                            id={`cr-${cr.id}`}
                            checked={selectedRegisters.has(cr.id)}
                            onCheckedChange={() => toggleRegister(cr.id)}
                            disabled={isLoading}
                          />
                          <span className="text-sm">{cr.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {locations.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay ubicaciones configuradas.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Visibilidad */}
          <div className="space-y-2">
            <Label>Visibilidad de datos</Label>
            <Select
              value={visibility}
              onValueChange={setVisibility}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">Solo sus operaciones</SelectItem>
                <SelectItem value="assigned_locations">
                  Ubicaciones asignadas
                </SelectItem>
                <SelectItem value="all">Todo el negocio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descuento máximo */}
          <div className="flex items-center justify-between">
            <Label>Descuento máximo</Label>
            <Select
              value={maxDiscount}
              onValueChange={setMaxDiscount}
              disabled={isLoading}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No permitido</SelectItem>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="100">Sin límite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comisión */}
          <div className="flex items-center justify-between">
            <Label>Comisión</Label>
            <Select
              value={commission}
              onValueChange={setCommission}
              disabled={isLoading}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No aplica</SelectItem>
                <SelectItem value="0.5">0,5%</SelectItem>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="2">2%</SelectItem>
                <SelectItem value="3">3%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
                <SelectItem value="10">10%</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "invite" ? "Crear invitación" : "Guardar cambios"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
