"use client";

import { MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { LocationCard } from "@/components/configuracion/location-card";
import { LocationSheet } from "@/components/configuracion/location-sheet";
import CashRegistersTab from "@/components/configuracion/ubicaciones/cash-registers-tab";
import {
  archiveLocationAction,
  deleteLocationAction,
  restoreLocationAction,
} from "@/lib/actions/locations";
import type { CashRegister } from "@/lib/services/cash-registers";
import type { Location } from "@/lib/services/locations";
import type { PointOfSale } from "@/lib/services/point-of-sale";

interface UbicacionesPageClientProps {
  initialLocations: Location[];
  initialCashRegisters: CashRegister[];
  initialPointsOfSale: PointOfSale[];
}

export function UbicacionesPageClient({
  initialLocations,
  initialCashRegisters,
  initialPointsOfSale,
}: UbicacionesPageClientProps) {
  const router = useRouter();

  async function handleArchive(id: string) {
    try {
      await archiveLocationAction(id);
      toast.success("Ubicación archivada");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar ubicación", {
        description: errorMessage,
      });
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreLocationAction(id);
      toast.success("Ubicación restaurada");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al restaurar ubicación", {
        description: errorMessage,
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLocationAction(id);
      toast.success("Ubicación eliminada");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar ubicación", {
        description: errorMessage,
      });
    }
  }

  function handleSuccess() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="ubicaciones" className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <TabsTrigger value="terminales" disabled>
                      Terminales
                    </TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Próximamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <TabsTrigger value="cajas">Cajas</TabsTrigger>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Próximamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TabsList>
        </div>

        <TabsContent value="ubicaciones" className="mt-6">
          <LocationSheet
            mode="create"
            onSuccess={handleSuccess}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar ubicación
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  N
                </Badge>
              </Button>
            }
          />
          {initialLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No hay ubicaciones</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Creá tu primera ubicación para organizar tus puntos de venta.
              </p>
              <LocationSheet
                mode="create"
                onSuccess={handleSuccess}
                trigger={
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar ubicación
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {initialLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onDelete={handleDelete}
                    onSuccess={handleSuccess}
                  />
                ))}
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground mt-6">
                Mostrando {initialLocations.length} ubicaci
                {initialLocations.length !== 1 ? "ones" : "ón"}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="terminales">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Próximamente</p>
          </div>
        </TabsContent>

        <TabsContent value="cajas">
          <CashRegistersTab
            initialCashRegisters={initialCashRegisters}
            locations={initialLocations.map((l) => ({
              id: l.id,
              name: l.name,
            }))}
            pointsOfSale={initialPointsOfSale.map((p) => ({
              id: p.id,
              name: p.name,
              number: p.number,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
