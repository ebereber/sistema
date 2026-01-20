"use client";

import {
  Monitor,
  MoreVertical,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
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

import type { PointOfSale } from "@/lib/services/point-of-sale";
import { POSSheet } from "./pos-sheet";

interface POSTableProps {
  pointsOfSale: PointOfSale[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onSuccess: () => void;
}

export function POSTable({
  pointsOfSale,
  isLoading,
  onDelete,
  onSuccess,
}: POSTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState<PointOfSale | null>(null);

  function openDeleteDialog(pos: PointOfSale) {
    setSelectedPOS(pos);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setSelectedPOS(null);
  }

  function handleConfirmDelete() {
    if (selectedPOS) {
      onDelete(selectedPOS.id);
    }
    closeDeleteDialog();
  }

  if (isLoading) {
    return (
      <div className="rounded-md border ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>ARCA</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
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

  if (pointsOfSale.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Store className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No hay puntos de venta</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Creá tu primer punto de venta para comenzar a operar.
        </p>
        <POSSheet
          mode="create"
          onSuccess={onSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar punto de venta
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
              <TableHead>Número</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>ARCA</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pointsOfSale.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell className="font-medium">{pos.number}</TableCell>
                <TableCell>{pos.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1">
                    {pos.is_digital ? (
                      <>
                        <Monitor className="h-3 w-3" />
                        Digital
                      </>
                    ) : (
                      <>
                        <Store className="h-3 w-3" />
                        Físico
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pos.is_digital ? (
                    <span className="text-muted-foreground">-</span>
                  ) : pos.location?.name ? (
                    pos.location.name
                  ) : (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={pos.enabled_for_arca ? "default" : "secondary"}
                  >
                    {pos.enabled_for_arca ? "Habilitado" : "No habilitado"}
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
                      <POSSheet
                        mode="edit"
                        posId={pos.id}
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
                        onClick={() => openDeleteDialog(pos)}
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
            <AlertDialogTitle>¿Eliminar punto de venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El punto de venta{" "}
              <strong>
                #{selectedPOS?.number} - {selectedPOS?.name}
              </strong>{" "}
              será eliminado permanentemente.
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
