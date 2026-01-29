"use client";

import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  type CashRegister,
  createCashRegister,
  deleteCashRegister,
  getCashRegisters,
  toggleCashRegisterStatus,
  updateCashRegister,
} from "@/lib/services/cash-registers";
import { getLocations, type Location } from "@/lib/services/locations";
import { getPointsOfSale, PointOfSale } from "@/lib/services/point-of-sale";

export default function CashRegistersTab() {
  // Data states
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCashRegister, setSelectedCashRegister] =
    useState<CashRegister | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location_id: "",
    point_of_sale_id: "",
  });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cashRegistersData, locationsData, posData] = await Promise.all([
        getCashRegisters(),
        getLocations(),
        getPointsOfSale(),
      ]);
      setCashRegisters(cashRegistersData);
      setLocations(locationsData);
      setPointsOfSale(posData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter by selected location
  /*  const filteredPOS = formData.location_id
    ? pointsOfSale.filter(
        (pos) => pos.location_id === formData.location_id || pos.is_digital,
      )
    : pointsOfSale; */
  const filteredPOS = pointsOfSale;

  // Filter cash registers by search
  const filteredCashRegisters = cashRegisters.filter((cr) =>
    cr.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handlers
  const handleEdit = (cashRegister: CashRegister) => {
    setEditingId(cashRegister.id);
    setFormData({
      name: cashRegister.name,
      location_id: cashRegister.location_id,
      point_of_sale_id: cashRegister.point_of_sale_id || "",
    });
    setIsSheetOpen(true);
  };

  const handleArchive = async (cashRegister: CashRegister) => {
    try {
      await toggleCashRegisterStatus(cashRegister.id);
      toast.success(
        cashRegister.status === "active"
          ? "Caja archivada"
          : "Caja desarchivada",
      );
      loadData();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDeleteClick = (cashRegister: CashRegister) => {
    setSelectedCashRegister(cashRegister);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCashRegister) return;

    try {
      await deleteCashRegister(selectedCashRegister.id);
      toast.success("Caja eliminada");
      setIsAlertOpen(false);
      setSelectedCashRegister(null);
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar caja");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateCashRegister(editingId, {
          name: formData.name,
          location_id: formData.location_id,
          point_of_sale_id: formData.point_of_sale_id || null,
        });
        toast.success("Caja actualizada");
      } else {
        await createCashRegister({
          name: formData.name,
          location_id: formData.location_id,
          point_of_sale_id: formData.point_of_sale_id || null,
        });
        toast.success("Caja creada");
      }

      setIsSheetOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error(
        editingId ? "Error al actualizar caja" : "Error al crear caja",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", location_id: "", point_of_sale_id: "" });
    setEditingId(null);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="space-y-4">
        {/* Search and Add Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-1 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full pl-8"
              />
            </div>
          </div>
          <div className="order-1 flex items-center gap-2 self-end sm:order-2 sm:self-auto">
            <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar caja
                  <kbd className="ml-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
                    N
                  </kbd>
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>
                    {editingId ? "Editar caja" : "Nueva caja"}
                  </SheetTitle>
                  <SheetDescription>
                    {editingId
                      ? "Modificá los datos de la caja."
                      : "Agregá una nueva caja para gestionar tus ventas."}
                  </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ej: Caja 1"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location-select">Ubicación *</Label>
                      <Select
                        value={formData.location_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            location_id: value,
                            point_of_sale_id: "", // Reset POS when location changes
                          })
                        }
                        required
                      >
                        <SelectTrigger id="location-select">
                          <SelectValue placeholder="Seleccioná una ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pos-select">
                        Punto de Venta por defecto
                      </Label>
                      <Select
                        value={formData.point_of_sale_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            point_of_sale_id: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger id="pos-select">
                          <SelectValue placeholder="Seleccioná un punto de venta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {filteredPOS.map((pos) => (
                            <SelectItem key={pos.id} value={pos.id}>
                              {pos.number} - {pos.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Opcional: punto de venta que se usará por defecto en
                        esta caja
                      </p>
                    </div>
                  </div>

                  <SheetFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSheetOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "Guardando..."
                        : editingId
                          ? "Guardar cambios"
                          : "Crear caja"}
                    </Button>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Punto de Venta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredCashRegisters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {searchQuery
                      ? "No se encontraron cajas"
                      : "No hay cajas creadas"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCashRegisters.map((cashRegister) => (
                  <TableRow key={cashRegister.id}>
                    <TableCell>
                      <span className="font-medium">{cashRegister.name}</span>
                    </TableCell>
                    <TableCell>
                      <span>{cashRegister.location?.name || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span>
                        {cashRegister.point_of_sale
                          ? `${cashRegister.point_of_sale.number} - ${cashRegister.point_of_sale.name}`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          cashRegister.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {cashRegister.status === "active"
                          ? "Activa"
                          : "Archivada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(cashRegister)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleArchive(cashRegister)}
                            >
                              {cashRegister.status === "active" ? (
                                <>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archivar
                                </>
                              ) : (
                                <>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Desarchivar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(cashRegister)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        {!isLoading && filteredCashRegisters.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredCashRegisters.length} caja
            {filteredCashRegisters.length !== 1 && "s"}
          </div>
        )}
      </div>

      {/* Alert Dialog for Delete */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar caja</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que querés eliminar la caja &quot;
              {selectedCashRegister?.name}&quot;? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
