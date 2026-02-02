"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardClock, Download, Search, Settings2, X } from "lucide-react";
import { useState } from "react";

// Tipos
type StockMovement = {
  date: string;
  location: string;
  reason: string;
  user: string;
  quantity: number;
  total: number;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  reserved: number;
  available: number;
  onHand: number;
  incoming: number;
  movements: StockMovement[];
};

// Datos de ejemplo
const inventoryData: InventoryItem[] = [
  {
    id: "1",
    name: "Billetera de Cuero",
    sku: "BI-019",
    reserved: 0,
    available: 13,
    onHand: 13,
    incoming: 4,
    movements: [
      {
        date: "ayer",
        location: "Depósito",
        reason: "Recepcion REC-00000010",
        user: "du7ow",
        quantity: 4,
        total: 7,
      },
    ],
  },
  {
    id: "2",
    name: "Blusa de Seda",
    sku: "BL-012",
    reserved: 0,
    available: 6,
    onHand: 1,
    incoming: 0,
    movements: [],
  },
  {
    id: "3",
    name: "Botas de Cuero Negro",
    sku: "BT-006",
    reserved: 0,
    available: 16,
    onHand: 6,
    incoming: 0,
    movements: [],
  },
];

export default function InventoryPage() {
  const [location, setLocation] = useState("Principal");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showMovementsDialog, setShowMovementsDialog] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({
    "1": 13,
    "2": 1,
    "3": 6,
  });

  const handleQuantityChange = (id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [id]: numValue }));
  };

  const openMovementsDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowMovementsDialog(true);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex h-full flex-1 flex-col space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
        </div>

        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="h-8 w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Principal">Principal</SelectItem>
                  <SelectItem value="Depósito">Depósito</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto…"
                  className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Button variant="outline" size="default" className="h-8">
              <Download className="mr-2 size-4" />
              Exportar
            </Button>
          </div>

          {/* Tabla */}
          <form className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-left">Producto</TableHead>
                      <TableHead className="text-left">SKU</TableHead>
                      <TableHead className="text-right">
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Reservado
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Disponible
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          En Mano
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Entrante
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="icon" className="size-8">
                          <Settings2 className="size-4" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-left">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="text-muted-foreground">
                            {item.sku}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums">{item.reserved}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums">{item.available}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="ml-auto w-24">
                            <Input
                              type="number"
                              step="1"
                              placeholder="0"
                              value={quantities[item.id]}
                              onChange={(e) =>
                                handleQuantityChange(item.id, e.target.value)
                              }
                              className="h-8 text-right font-medium"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="tabular-nums">{item.incoming}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openMovementsDialog(item)}
                          >
                            <ClipboardClock className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between px-2">
              <div className="hidden flex-1 text-sm text-muted-foreground md:block">
                Mostrando 18 de 18 resultados
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                  Página 1 de 1
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Dialog de Movimientos de Stock */}
      <Dialog open={showMovementsDialog} onOpenChange={setShowMovementsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Movimientos de Stock - {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <div className="overflow-x-auto">
              <div className="relative w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-left">
                        Fecha
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-left">
                        Ubicación
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-left">
                        Motivo
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-left">
                        Usuario
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        Cantidad
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItem?.movements &&
                    selectedItem.movements.length > 0 ? (
                      selectedItem.movements.map((movement, index) => (
                        <TableRow key={index}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {movement.date}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="max-w-xs">{movement.location}</div>
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="max-w-xs truncate">
                              {movement.reason}
                            </div>
                          </TableCell>
                          <TableCell className="text-left">
                            {movement.user}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="mr-2 text-left text-muted-foreground">
                              (+{movement.quantity})
                            </span>{" "}
                            {movement.total}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No hay movimientos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogClose className="absolute right-2 top-2">
            <Button variant="ghost" size="icon" className="size-7">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
