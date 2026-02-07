"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

export function InventorySettingsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" type="button">
          <Settings2 className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              Configuración de columnas
            </h4>
            <p className="text-muted-foreground text-sm">
              Personalizá qué columnas querés ver en la tabla
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-reserved" className="font-normal">
                Mostrar reservado
              </Label>
              <Switch id="show-reserved" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-available" className="font-normal">
                Mostrar disponible
              </Label>
              <Switch id="show-available" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-onhand" className="font-normal">
                Mostrar en mano
              </Label>
              <Switch id="show-onhand" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show-incoming" className="font-normal">
                Mostrar entrante
              </Label>
              <Switch id="show-incoming" defaultChecked />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
