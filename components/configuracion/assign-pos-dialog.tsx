"use client";

import { Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
  assignPOSToLocation,
  getAvailablePOS,
  type PointOfSale,
} from "@/lib/services/point-of-sale";

interface AssignPOSDialogProps {
  locationId: string;
  locationName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AssignPOSDialog({
  locationId,
  locationName,
  trigger,
  onSuccess,
}: AssignPOSDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [available, setAvailable] = useState<PointOfSale[]>([]);
  const [assignedToOther, setAssignedToOther] = useState<PointOfSale[]>([]);

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState<PointOfSale | null>(null);

  useEffect(() => {
    if (open) {
      loadAvailablePOS();
    }
  }, [open]);

  async function loadAvailablePOS() {
    setIsLoading(true);
    try {
      const data = await getAvailablePOS(locationId);
      setAvailable(data.available);
      setAssignedToOther(data.assignedToOther);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar puntos de venta", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAssign(pos: PointOfSale) {
    // If POS is already assigned to another location, show confirmation
    if (pos.location_id) {
      setSelectedPOS(pos);
      setConfirmDialogOpen(true);
      return;
    }

    // Direct assignment for available POS
    await performAssignment(pos);
  }

  async function performAssignment(pos: PointOfSale) {
    setIsLoading(true);
    try {
      await assignPOSToLocation(pos.id, locationId);
      toast.success(`Punto de venta #${pos.number} asignado correctamente`);
      setOpen(false);
      setSearchQuery("");
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al asignar punto de venta", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmReassign() {
    if (selectedPOS) {
      await performAssignment(selectedPOS);
    }
    setConfirmDialogOpen(false);
    setSelectedPOS(null);
  }

  function filterPOS(posList: PointOfSale[]): PointOfSale[] {
    if (!searchQuery.trim()) return posList;

    const query = searchQuery.toLowerCase();
    return posList.filter(
      (pos) =>
        pos.name.toLowerCase().includes(query) ||
        pos.number.toString().includes(query)
    );
  }

  const filteredAvailable = filterPOS(available);
  const filteredAssignedToOther = filterPOS(assignedToOther);
  const hasResults =
    filteredAvailable.length > 0 || filteredAssignedToOther.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar punto de venta
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Punto de Venta</DialogTitle>
            <DialogDescription>
              Asigná un punto de venta a <strong>{locationName}</strong>
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o nombre..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No se encontraron puntos de venta"
                  : "No hay puntos de venta disponibles"}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              {/* Available POS */}
              {filteredAvailable.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-1">
                    Disponibles
                  </p>
                  {filteredAvailable.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => handleAssign(pos)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between py-3 px-3 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{pos.number}</span>
                        <span className="text-sm">{pos.name}</span>
                      </div>
                      {pos.enabled_for_arca && (
                        <Badge variant="outline" className="text-xs">
                          ARCA
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Separator */}
              {filteredAvailable.length > 0 &&
                filteredAssignedToOther.length > 0 && (
                  <Separator className="my-4" />
                )}

              {/* Assigned to Other Locations */}
              {filteredAssignedToOther.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground px-1">
                    Asignados a otra ubicación
                  </p>
                  {filteredAssignedToOther.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => handleAssign(pos)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between py-3 px-3 rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{pos.number}</span>
                          <span className="text-sm">{pos.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          En: {pos.location?.name || "Ubicación desconocida"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pos.enabled_for_arca && (
                          <Badge variant="outline" className="text-xs">
                            ARCA
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Reasignar
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Reassignment Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reasignar punto de venta?</AlertDialogTitle>
            <AlertDialogDescription>
              El punto de venta{" "}
              <strong>
                #{selectedPOS?.number} - {selectedPOS?.name}
              </strong>{" "}
              está actualmente asignado a{" "}
              <strong>{selectedPOS?.location?.name}</strong>.
              <span className="block mt-2">
                ¿Querés reasignarlo a <strong>{locationName}</strong>?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReassign}>
              Reasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
