"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFee } from "@/lib/services/payment-methods";
import type { PaymentMethod } from "@/types/payment-method";
import * as Icons from "lucide-react";
import { MoreVertical, Pencil, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";

const availabilityLabels: Record<string, string> = {
  VENTAS: "Ventas",
  COMPRAS: "Compras",
  VENTAS_Y_COMPRAS: "Ventas y Compras",
};

const availabilityVariants: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  VENTAS: "default",
  COMPRAS: "secondary",
  VENTAS_Y_COMPRAS: "outline",
};

interface PaymentMethodsTableProps {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (method: PaymentMethod) => void;
}

export function PaymentMethodsTable({
  paymentMethods,
  isLoading,
  onRefresh,
  onEdit,
}: PaymentMethodsTableProps) {
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(
    null,
  );

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Sin medios de pago</h3>
        <p className="text-sm text-muted-foreground">
          No se encontraron medios de pago. Agrega uno nuevo para comenzar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Disponibilidad</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((method) => {
              const IconComponent = (Icons as Record<string, unknown>)[
                method.icon
              ] as React.ComponentType<{ className?: string }> | undefined;

              return (
                <TableRow key={method.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 border rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {IconComponent ? (
                          <IconComponent className="h-5 w-5" />
                        ) : (
                          <Wallet className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{method.name}</p>
                        {!method.is_active && (
                          <p className="text-xs text-muted-foreground">
                            Inactivo
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFee(method.fee_percentage, method.fee_fixed)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {method.requires_reference ? "Sí" : "No"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        availabilityVariants[method.availability] || "outline"
                      }
                    >
                      {availabilityLabels[method.availability] ||
                        method.availability}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(method)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {!method.is_system && (
                          <DropdownMenuItem
                            onClick={() => setDeletingMethod(method)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {deletingMethod && (
        <DeleteConfirmationDialog
          open={!!deletingMethod}
          onOpenChange={(open) => {
            if (!open) setDeletingMethod(null);
          }}
          paymentMethod={deletingMethod}
          onSuccess={() => {
            setDeletingMethod(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
