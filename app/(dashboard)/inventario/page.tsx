import { InventoryTable } from "@/components/inventario/inventory-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Gestión de inventario y stock de productos",
};

// Datos de ejemplo
const inventoryItems = [
  {
    id: "1",
    name: "Alcohol Etílico 70% 500ml",
    sku: "ALC-001",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "2",
    name: "Desengrasante Multiuso Doypack",
    sku: "DES-M-01",
    reserved: 0,
    available: 9,
    onHand: 9,
    incoming: 0,
  },
  {
    id: "3",
    name: "Desinfectante Aerosol 360ml",
    sku: "AERO-D-01",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "4",
    name: "Esponja de Cocina Doble Faz",
    sku: "ESP-001",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "5",
    name: "Jabón Limpia Manchas",
    sku: "DKA-8745",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "6",
    name: "Jabón Líquido para Ropa 3l",
    sku: "JAB-R-03",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "7",
    name: "Limpiador de Pisos Lavanda 900ml",
    sku: "LIM-P-01",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "8",
    name: "Lustramuebles Siliconado 400ml",
    sku: "LUS-001",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
  {
    id: "9",
    name: "Suavizante para Ropa 1.5l",
    sku: "SUA-001",
    reserved: 0,
    available: 10,
    onHand: 10,
    incoming: 0,
  },
];

export default function InventoryPage() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">Inventario</h2>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Warehouse Select */}
            <Select defaultValue="principal">
              <SelectTrigger className="h-8 w-full sm:w-[200px]">
                <SelectValue placeholder="Seleccionar ubicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="deposito">Depósito</SelectItem>
                <SelectItem value="sucursal">Sucursal Centro</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-2 left-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto…"
                className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
                name="search"
              />
            </div>
          </div>

          {/* Export Button */}
          <Button variant="outline" className="active:scale-[0.97]">
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
        </div>

        {/* Inventory Table */}
        <InventoryTable items={inventoryItems} />
      </div>
    </div>
  );
}
