"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { LocationForProducts } from "@/lib/services/products-cached";
import type { StockByLocationData } from "@/lib/validations/product";

interface StockTableProps {
  value: StockByLocationData[];
  onChange: (value: StockByLocationData[]) => void;
  disabled?: boolean;
  locations: LocationForProducts[];
}

const INITIAL_VISIBLE_COUNT = 2;

export function StockTable({
  value,
  onChange,
  disabled,
  locations,
}: StockTableProps) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (value.length === 0 && locations.length > 0) {
      const initialStock = locations.map((loc) => ({
        location_id: loc.id,
        location_name: loc.name,
        is_main: loc.is_main ?? false,
        quantity: 0,
      }));
      onChange(initialStock);
    }
  }, [locations, value.length, onChange]);

  function handleQuantityChange(locationId: string, quantity: number) {
    const newValue = value.map((item) =>
      item.location_id === locationId
        ? { ...item, quantity: Math.max(0, quantity) }
        : item,
    );
    onChange(newValue);
  }

  function getStockForLocation(locationId: string): number {
    const stock = value.find((s) => s.location_id === locationId);
    return stock?.quantity ?? 0;
  }

  const totalStock = value.reduce((sum, s) => sum + s.quantity, 0);
  const hasMoreLocations = locations.length > INITIAL_VISIBLE_COUNT;
  const visibleLocations = showAll
    ? locations
    : locations.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = locations.length - INITIAL_VISIBLE_COUNT;

  if (locations.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No hay ubicaciones configuradas. Creá una ubicación en Configuración.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ubicación</TableHead>
            <TableHead className="w-32 text-right">Disponible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleLocations.map((location) => (
            <TableRow key={location.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{location.name}</span>
                  {location.is_main && (
                    <Badge variant="secondary" className="text-xs">
                      Principal
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={getStockForLocation(location.id) || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleQuantityChange(
                      location.id,
                      val === "" ? 0 : parseInt(val) || 0,
                    );
                  }}
                  className="w-24 text-right ml-auto [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  disabled={disabled}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium">
              {totalStock}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>

      {hasMoreLocations && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Ocultar ubicaciones
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Ver {hiddenCount} ubicación{hiddenCount !== 1 ? "es" : ""} más
            </>
          )}
        </Button>
      )}
    </div>
  );
}
