"use client";

import { DollarSign, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

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

import type { PriceList } from "@/lib/services/price-lists";
import { PriceListDialog } from "./price-list-dialog";
import { PriceListSheet } from "./price-list-sheet";

interface PriceListTableProps {
  priceLists: PriceList[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onSuccess: () => void;
}

export function PriceListTable({
  priceLists,
  isLoading,
  onDelete,
  onSuccess,
}: PriceListTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(
    null
  );

  function openDeleteDialog(priceList: PriceList) {
    setSelectedPriceList(priceList);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setSelectedPriceList(null);
  }

  function handleConfirmDelete() {
    if (selectedPriceList) {
      onDelete(selectedPriceList.id);
    }
    closeDeleteDialog();
  }

  function formatPercentage(
    adjustmentType: string,
    percentage: number
  ): string {
    if (adjustmentType === "DESCUENTO") {
      return `-${percentage}%`;
    }
    return `+${percentage}%`;
  }

  function getPercentageColor(adjustmentType: string): string {
    if (adjustmentType === "DESCUENTO") {
      return "text-red-600";
    }
    return "text-green-600";
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo de Cálculo</TableHead>
              <TableHead>Porcentaje</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
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

  if (priceLists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <DollarSign className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No hay listas de precios</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Creá tu primera lista de precios para aplicar descuentos o aumentos
          automáticos.
        </p>
        <PriceListDialog
          mode="create"
          onSuccess={onSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar lista de precios
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo de Cálculo</TableHead>
              <TableHead>Porcentaje</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceLists.map((priceList) => (
              <TableRow key={priceList.id}>
                <TableCell className="font-medium">{priceList.name}</TableCell>
                <TableCell>
                  <Badge variant={"outline"}>
                    {priceList.is_automatic ? "Automática" : "Manual"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-medium ${getPercentageColor(
                      priceList.adjustment_type ?? ""
                    )}`}
                  >
                    {formatPercentage(
                      priceList.adjustment_type ?? "",
                      priceList.adjustment_percentage ?? 0
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {priceList.includes_tax ? "Incluido" : "No incluido"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <PriceListSheet
                        mode="edit"
                        priceListId={priceList.id}
                        onSuccess={onSuccess}
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(priceList)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lista de precios?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los clientes con esta lista
              asignada quedarán sin lista de precios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
