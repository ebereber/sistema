"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

import { getStockMovements, type StockMovement } from "@/lib/services/products";
import { cn } from "@/lib/utils";

interface StockMovementsDialogProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StockMovementsDialog({
  productId,
  productName,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: StockMovementsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    if (open) {
      loadMovements();
    }
  }, [open, productId]);

  async function loadMovements() {
    setIsLoading(true);
    try {
      const data = await getStockMovements(productId);
      setMovements(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar movimientos", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(date: string): string {
    return format(new Date(date), "d MMM", { locale: es });
  }

  function getLocationDisplay(movement: StockMovement): React.ReactNode {
    const fromName = movement.location_from?.name;
    const toName = movement.location_to?.name;

    if (fromName && toName) {
      // Transfer between locations
      return (
        <span className="flex items-center gap-1">
          <span>{fromName}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{toName}</span>
        </span>
      );
    } else if (toName) {
      // Entry (incoming)
      return (
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">-</span>
          <ArrowRight className="h-3 w-3" />
          <span>{toName}</span>
        </span>
      );
    } else if (fromName) {
      // Exit (outgoing)
      return (
        <span className="flex items-center gap-1">
          <span>{fromName}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-muted-foreground">-</span>
        </span>
      );
    }

    return "-";
  }

  function getQuantityDisplay(movement: StockMovement): React.ReactNode {
    const isEntry = !!movement.location_to_id && !movement.location_from_id;
    const isExit = !!movement.location_from_id && !movement.location_to_id;

    if (isEntry) {
      return (
        <span className="text-green-600 font-medium">
          (+{movement.quantity})
        </span>
      );
    } else if (isExit) {
      return (
        <span className="text-red-600 font-medium">(-{movement.quantity})</span>
      );
    }

    // Transfer - show neutral
    return <span className="font-medium">{movement.quantity}</span>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="link" size="sm" className="h-auto p-0">
              <Package className="mr-1 h-3 w-3" />
              Movimientos
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Movimientos de Stock - {productName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay movimientos de stock
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Fecha</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right w-24">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {formatDate(movement.created_at)}
                    </TableCell>
                    <TableCell>{getLocationDisplay(movement)}</TableCell>
                    <TableCell>
                      {movement.reason && movement.reason.length > 25 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-left">
                              {movement.reason.substring(0, 25)}...
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{movement.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        movement.reason || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {movement.user?.name ? (
                        movement.user.name.length > 15 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {movement.user.name.substring(0, 15)}...
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{movement.user.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          movement.user.name
                        )
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {getQuantityDisplay(movement)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
