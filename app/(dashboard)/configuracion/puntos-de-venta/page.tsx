"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { POSSheet } from "@/components/configuracion/pos-sheet";
import { POSTable } from "@/components/configuracion/pos-table";
import {
  deletePOS,
  getPointsOfSale,
  type PointOfSale,
} from "@/lib/services/point-of-sale";

export default function PuntosDeVentaPage() {
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPointsOfSale = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPointsOfSale();
      setPointsOfSale(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar puntos de venta", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPointsOfSale();
  }, [loadPointsOfSale]);

  async function handleDelete(id: string) {
    try {
      await deletePOS(id);
      toast.success("Punto de venta eliminado");
      loadPointsOfSale();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar punto de venta", {
        description: errorMessage,
      });
    }
  }

  function handleSuccess() {
    loadPointsOfSale();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <POSSheet
          mode="create"
          onSuccess={handleSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar punto de venta
              <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                N
              </Badge>
            </Button>
          }
        />
      </div>

      {/* Table */}
      <POSTable
        pointsOfSale={pointsOfSale}
        isLoading={isLoading}
        onDelete={handleDelete}
        onSuccess={handleSuccess}
      />

      {/* Results count */}
      {!isLoading && pointsOfSale.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Mostrando {pointsOfSale.length} punto
          {pointsOfSale.length !== 1 ? "s" : ""} de venta
        </div>
      )}
    </div>
  );
}
