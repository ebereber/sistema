"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";
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

import { getPriceHistoryAction } from "@/lib/actions/products";
import { type PriceHistory } from "@/lib/services/products";

interface PriceHistoryDialogProps {
  productId: string;
  productName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PriceHistoryDialog({
  productId,
  productName,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: PriceHistoryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<PriceHistory[]>([]);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, productId]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const data = await getPriceHistoryAction(productId);
      setHistory(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar historial", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number | null): string {
    if (amount === null) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  }

  function formatDate(date: string): string {
    return format(new Date(date), "d MMM", { locale: es });
  }

  function formatPercentage(value: number | null): string {
    if (value === null) return "-";
    return `${value.toFixed(1)}%`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="link" size="sm" className="h-auto p-0">
              <History className="mr-1 h-3 w-3" />
              Historial
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Historial de Precios - {productName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay historial de precios
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Fecha</TableHead>
                  <TableHead className="text-right">Costo s/IVA</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(item.margin_percentage)}
                    </TableCell>
                    <TableCell>
                      {item.reason && item.reason.length > 20 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="text-left">
                              {item.reason.substring(0, 20)}...
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{item.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        item.reason || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.user?.name ? (
                        item.user.name.length > 15 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {item.user.name.substring(0, 15)}...
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{item.user.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          item.user.name
                        )
                      ) : (
                        "-"
                      )}
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
