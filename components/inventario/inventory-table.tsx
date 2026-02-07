"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClipboardClock } from "lucide-react";
import { useState } from "react";
import { InventoryHistoryDialog } from "./inventory-history-dialog";
import { InventorySettingsPopover } from "./inventory-settings-popover";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  reserved: number;
  available: number;
  onHand: number;
  incoming: number;
}

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.available }), {}),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [itemId]: numValue }));
  };

  return (
    <form className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <div className="relative w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">
                  <span>Producto</span>
                </TableHead>
                <TableHead className="text-left">
                  <span>SKU</span>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Reservado
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cantidad reservada en pedidos pendientes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Disponible
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cantidad disponible para venta</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          En Mano
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cantidad física en ubicación</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          Entrante
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Cantidad en tránsito o pedidos de compra</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-right">
                  <InventorySettingsPopover />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-left">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <span className="text-muted-foreground">{item.sku}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">{item.reserved}</span>
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
                        id={`items.${index}.quantity`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">{item.onHand}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums">{item.incoming}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="hidden flex-1 text-muted-foreground text-sm md:block">
          Mostrando {items.length} de {items.length} resultados
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[150px] items-center justify-center font-medium text-sm">
            Página 1 de 1
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 h-8 w-8 lg:flex"
            disabled
          >
            <span className="sr-only">Ir a la primera página</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m11 17-5-5 5-5" />
              <path d="m18 17-5-5 5-5" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 h-8 w-8"
            disabled
          >
            <span className="sr-only">Ir a la página anterior</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 h-8 w-8"
            disabled
          >
            <span className="sr-only">Ir a la página siguiente</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 h-8 w-8 lg:flex"
            disabled
          >
            <span className="sr-only">Ir a la última página</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </Button>
        </div>
      </div>

      {/* History Dialog */}
      <InventoryHistoryDialog
        open={selectedItemId !== null}
        onOpenChange={(open) => !open && setSelectedItemId(null)}
        itemName={items.find((item) => item.id === selectedItemId)?.name || ""}
      />
    </form>
  );
}
