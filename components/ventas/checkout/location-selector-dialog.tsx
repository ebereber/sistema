// components/ventas/checkout/location-selector.tsx
"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/lib/auth/user-provider";
import type { Location } from "@/lib/services/locations";

interface LocationSelectorProps {
  location: { id: string; name: string } | null;
  onLocationChange: (location: { id: string; name: string }) => void;
  saleDate: Date;
  onSaleDateChange: (date: Date) => void;
  allLocations: Location[];
}

export function LocationSelector({
  location,
  onLocationChange,
  saleDate,
  onSaleDateChange,
  allLocations,
}: LocationSelectorProps) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();

  // Filter by user permissions (client-side)
  const locations = useMemo(() => {
    if (user?.dataVisibilityScope === "all") {
      return allLocations.filter((l) => l.active);
    } else if (user?.locationIds && user.locationIds.length > 0) {
      return allLocations.filter(
        (l) => l.active && user.locationIds.includes(l.id),
      );
    }
    return [];
  }, [allLocations, user]);

  const formattedDate = format(saleDate, "d/M", { locale: es });

  const handleLocationChange = (locationId: string) => {
    const selected = locations.find((l) => l.id === locationId);
    if (selected) {
      onLocationChange({ id: selected.id, name: selected.name });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {location?.name || "Sin ubicación"} · {formattedDate}
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-1.5 p-0 text-muted-foreground"
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Editar ubicación</span>
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubicación y fecha</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Fecha de emisión */}
          <div className="space-y-2">
            <Label htmlFor="invoiceDateInput">Fecha de emisión</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal active:scale-100"
                  id="invoiceDateInput"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(saleDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={saleDate}
                  onSelect={(newDate) => newDate && onSaleDateChange(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ubicación */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Ubicación (stock)</Label>
            {locations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No tenés ubicaciones asignadas
              </div>
            ) : (
              <Select
                value={location?.id || ""}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger id="warehouse" className="w-full">
                  <SelectValue placeholder="Seleccionar ubicación" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.is_main && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (Principal)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 top-2"
            type="button"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
