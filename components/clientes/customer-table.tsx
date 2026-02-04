"use client";

import {
  Archive,
  ArchiveRestore,
  Badge,
  Eye,
  MoreVertical,
  Plus,
  ShoppingCart,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

import type { Customer } from "@/lib/services/customers";
import { cn } from "@/lib/utils";
import { CustomerDialog } from "./customer-dialog";

interface CustomerTableProps {
  customers: Customer[];
  isLoading?: boolean;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSuccess: () => void;
}

type DialogType = "archive" | "unarchive" | "delete" | null;

export function CustomerTable({
  customers,
  isLoading,
  onArchive,
  onUnarchive,
  onDelete,
  onSuccess,
}: CustomerTableProps) {
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  function formatDocument(
    taxIdType: string | null,
    taxId: string | null,
  ): string {
    if (!taxId) return "-";
    return `${taxIdType || "DOC"} ${taxId}`;
  }

  function formatPhone(phone: string | null): string {
    if (!phone) return "-";
    return phone;
  }

  function openDialog(type: DialogType, customer: Customer) {
    setDialogType(type);
    setSelectedCustomer(customer);
  }

  function closeDialog() {
    setDialogType(null);
    setSelectedCustomer(null);
  }

  function handleConfirm() {
    if (!selectedCustomer) return;

    switch (dialogType) {
      case "archive":
        onArchive(selectedCustomer.id);
        break;
      case "unarchive":
        onUnarchive(selectedCustomer.id);
        break;
      case "delete":
        onDelete(selectedCustomer.id);
        break;
    }
    closeDialog();
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
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

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Sin clientes</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No hay clientes que coincidan con tu búsqueda.
        </p>
        <CustomerDialog
          mode="create"
          onSuccess={onSuccess}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
              <Badge className="ml-2 px-1.5 py-0 text-xs">N</Badge>
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
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow
                key={customer.id}
                className={cn(
                  "cursor-pointer",
                  !customer.active && "opacity-50",
                )}
              >
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDocument(customer.tax_id_type, customer.tax_id)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatPhone(customer.phone)}
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
                      <DropdownMenuItem asChild>
                        <Link href={`/clientes/${customer.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/ventas/nueva?customerId=${customer.id}`}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Crear venta
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {customer.active ? (
                        <DropdownMenuItem
                          onClick={() => openDialog("archive", customer)}
                          className="text-orange-600 focus:text-orange-600"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archivar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => openDialog("unarchive", customer)}
                          className="text-green-600 focus:text-green-600"
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Desarchivar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => openDialog("delete", customer)}
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

      {/* Archive Dialog */}
      <AlertDialog
        open={dialogType === "archive"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que querés archivar este cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción archivará el cliente &quot;{selectedCustomer?.name}
              &quot;. Podés desarchivarlo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              Archivar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Dialog */}
      <AlertDialog
        open={dialogType === "unarchive"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Estás seguro que querés desarchivar este cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desarchivará el cliente &quot;{selectedCustomer?.name}
              &quot; y volverá a estar disponible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Desarchivar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={dialogType === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente a{" "}
              <span className="font-semibold">{selectedCustomer?.name}</span> y
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
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
