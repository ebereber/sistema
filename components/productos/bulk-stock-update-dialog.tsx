"use client";

import { Loader2, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createClient } from "@/lib/supabase/client";
import { getLocations, type Location } from "@/lib/services/locations";
import { bulkUpdateStock, type BulkFilters } from "@/lib/services/products";

interface BulkStockUpdateDialogProps {
  selectedIds: string[];
  filters?: BulkFilters;
  allSelected: boolean;
  totalCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkStockUpdateDialog({
  selectedIds,
  filters,
  allSelected,
  totalCount,
  open,
  onOpenChange,
  onSuccess,
}: BulkStockUpdateDialogProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [operation, setOperation] = useState<"replace" | "increase">("replace");
  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const count = allSelected ? totalCount : selectedIds.length;

  const loadLocations = useCallback(async () => {
    setIsLoadingLocations(true);
    try {
      const locs = await getLocations();
      setLocations(locs);
      if (locs.length > 0) {
        // Default to main location if exists
        const mainLoc = locs.find((l) => l.is_main);
        setLocationId(mainLoc?.id || locs[0].id);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Error al cargar ubicaciones");
    } finally {
      setIsLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadLocations();
    }
  }, [open, loadLocations]);

  async function handleSubmit() {
    if (!locationId) {
      toast.error("Seleccioná una ubicación");
      return;
    }

    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Error de autenticación");
        return;
      }

      const updated = await bulkUpdateStock({
        productIds: allSelected ? undefined : selectedIds,
        filters: allSelected ? filters : undefined,
        locationId,
        operation,
        quantity: numQuantity,
        reason: reason || undefined,
        userId: user.id,
      });

      toast.success(`Stock actualizado`, {
        description: `Se actualizaron ${updated} producto${updated !== 1 ? "s" : ""}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error updating stock:", error);
      toast.error("Error al actualizar stock");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setOperation("replace");
    setQuantity("");
    setReason("");
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Actualizar stock
          </DialogTitle>
          <DialogDescription>
            Se actualizará el stock de {count} producto{count !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoadingLocations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.is_main && " (Principal)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operación</Label>
              <RadioGroup
                value={operation}
                onValueChange={(v: "replace" | "increase") => setOperation(v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="font-normal cursor-pointer">
                    Reemplazar stock
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="increase" id="increase" />
                  <Label htmlFor="increase" className="font-normal cursor-pointer">
                    Aumentar stock
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>
                {operation === "replace" ? "Nueva cantidad" : "Cantidad a agregar"}
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="[&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
              />
            </div>

            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Ej: Inventario inicial, Compra, Ajuste..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {quantity && !isNaN(parseInt(quantity)) && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>
                  {operation === "replace" ? (
                    <>
                      El stock se <span className="font-medium">reemplazará</span> a{" "}
                      <span className="font-medium">{quantity}</span> unidades en{" "}
                      {locations.find((l) => l.id === locationId)?.name}
                    </>
                  ) : (
                    <>
                      Se <span className="text-green-600">agregarán</span>{" "}
                      <span className="font-medium">{quantity}</span> unidades al stock
                      en {locations.find((l) => l.id === locationId)?.name}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !locationId || quantity === ""}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
