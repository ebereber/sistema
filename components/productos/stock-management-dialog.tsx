"use client";

import { Loader2, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { createClient } from "@/lib/supabase/client";
import { getLocations, type Location } from "@/lib/services/locations";
import { updateProductStockAction } from "@/lib/actions/products";
import type { Product } from "@/lib/services/products";

interface StockManagementDialogProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockManagementDialog({
  product,
  onClose,
  onSuccess,
}: StockManagementDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stockByLocation, setStockByLocation] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Load locations
      const locs = await getLocations();
      setLocations(locs);

      // Load current stock
      const { data: stockData } = await supabase
        .from("stock")
        .select("location_id, quantity")
        .eq("product_id", product.id);

      // Map stock by location
      const stockMap: Record<string, number> = {};
      stockData?.forEach((s) => {
        stockMap[s.location_id] = s.quantity;
      });

      // Initialize locations without stock with 0
      locs.forEach((loc) => {
        if (stockMap[loc.id] === undefined) {
          stockMap[loc.id] = 0;
        }
      });

      setStockByLocation(stockMap);
    } catch (error) {
      console.error("Error loading stock:", error);
      toast.error("Error al cargar el stock");
    } finally {
      setIsLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalStock = Object.values(stockByLocation).reduce(
    (sum, qty) => sum + qty,
    0
  );

  async function handleUpdate() {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Error de autenticación");
        return;
      }

      await updateProductStockAction(product.id, {
        stockByLocation: Object.entries(stockByLocation).map(
          ([location_id, quantity]) => ({
            location_id,
            quantity,
          })
        ),
        userId: user.id,
      });

      toast.success("Stock actualizado correctamente");
      onSuccess();
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("No se pudo actualizar el stock");
    } finally {
      setIsSaving(false);
    }
  }

  function handleQuantityChange(locationId: string, value: string) {
    const quantity = value === "" ? 0 : parseInt(value) || 0;
    setStockByLocation((prev) => ({
      ...prev,
      [locationId]: Math.max(0, quantity),
    }));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestión de Stock - {product.name}
          </DialogTitle>
          <DialogDescription>
            Administrá el stock de este producto en cada ubicación
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stock Total */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Stock Total:</p>
              <p className="text-3xl font-bold">{totalStock} unidades</p>
            </div>

            {/* Stock por Ubicación */}
            <div>
              <p className="text-sm font-medium mb-3">Stock por Ubicación</p>
              <div className="space-y-3">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="truncate">{location.name}</span>
                      {location.is_main && (
                        <Badge variant="secondary" className="shrink-0">
                          Principal
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="number"
                      className="w-24 text-right [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      value={stockByLocation[location.id] || ""}
                      placeholder="0"
                      onChange={(e) =>
                        handleQuantityChange(location.id, e.target.value)
                      }
                      min={0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleUpdate}
            disabled={isLoading || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar Stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
