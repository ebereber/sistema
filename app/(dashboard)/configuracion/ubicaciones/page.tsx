"use client";

import { MapPin, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  archiveLocation,
  deleteLocation,
  getLocations,
  type Location,
} from "@/lib/services/locations";

export default function UbicacionesPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar ubicaciones", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function handleArchive(id: string) {
    try {
      await archiveLocation(id);
      toast.success("Ubicación archivada");
      loadLocations();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al archivar ubicación", {
        description: errorMessage,
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLocation(id);
      toast.success("Ubicación eliminada");
      loadLocations();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar ubicación", {
        description: errorMessage,
      });
    }
  }

  function handleSuccess() {
    loadLocations();
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
          {isLoading ? (
            <div className="flex flex-col w-full min-h-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : locations.length === 0 ? (
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
                {locations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onSuccess={handleSuccess}
                  />
                ))}
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground mt-6">
                Mostrando {locations.length} ubicaci
                {locations.length !== 1 ? "ones" : "ón"}
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
          <CashRegistersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
