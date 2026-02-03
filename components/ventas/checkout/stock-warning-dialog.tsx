"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StockCheckResult } from "@/lib/services/sales";

interface StockWarningDialogProps {
  open: boolean;
  shortages: StockCheckResult[];
  locationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StockWarningDialog({
  open,
  shortages,
  locationName,
  onConfirm,
  onCancel,
}: StockWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Stock insuficiente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Los siguientes productos no tienen stock suficiente en{" "}
                <strong>{locationName}</strong>:
              </p>
              <ul className="space-y-2 text-sm">
                {shortages.map((item) => (
                  <li
                    key={item.productId}
                    className="flex justify-between rounded border p-2"
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-600">
                        Disponible: {item.available}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Solicitado: {item.requested}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Si continuás, el stock quedará en negativo.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continuar de todas formas
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
