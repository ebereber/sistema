"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  archiveSafeBoxAction,
  createSafeBoxAction,
  deleteSafeBoxAction,
  restoreSafeBoxAction,
  updateSafeBoxAction,
} from "@/lib/actions/safe-boxes";
import type { SafeBox } from "@/lib/services/safe-boxes-cached";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface DepositSafesTabProps {
  initialSafeBoxes: SafeBox[];
  locations: { id: string; name: string }[];
}

export default function DepositSafesTab({
  initialSafeBoxes,
  locations,
}: DepositSafesTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit mode
  const [editingSafeBox, setEditingSafeBox] = useState<SafeBox | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("none");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [initialBalance, setInitialBalance] = useState("0");
  const [balanceDate, setBalanceDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const filteredSafeBoxes = initialSafeBoxes.filter((safeBox) =>
    safeBox.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function openCreateSheet() {
    setEditingSafeBox(null);
    handleReset();
    setIsSheetOpen(true);
  }

  function openEditSheet(safeBox: SafeBox) {
    setEditingSafeBox(safeBox);
    setName(safeBox.name);
    setSelectedLocation(safeBox.location_id || "none");
    setCurrency(safeBox.currency as "ARS" | "USD");
    setInitialBalance(String(safeBox.initial_balance));
    setBalanceDate(safeBox.balance_date);
    setIsSheetOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        name,
        location_id: selectedLocation === "none" ? null : selectedLocation,
        currency,
        initial_balance: parseFloat(initialBalance) || 0,
        balance_date: balanceDate,
      };

      if (editingSafeBox) {
        await updateSafeBoxAction(editingSafeBox.id, payload);
        toast.success("Caja fuerte actualizada");
      } else {
        await createSafeBoxAction(payload);
        toast.success("Caja fuerte creada");
      }

      handleReset();
      setIsSheetOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(editingSafeBox ? "Error al actualizar" : "Error al crear", {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setSelectedLocation("none");
    setCurrency("ARS");
    setInitialBalance("0");
    setBalanceDate(new Date().toISOString().split("T")[0]);
    setEditingSafeBox(null);
  };

  const handleCancel = () => {
    handleReset();
    setIsSheetOpen(false);
  };

  async function handleArchive(id: string) {
    try {
      await archiveSafeBoxAction(id);
      toast.success("Caja fuerte archivada");
      router.refresh();
    } catch {
      toast.error("Error al archivar caja fuerte");
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreSafeBoxAction(id);
      toast.success("Caja fuerte restaurada");
      router.refresh();
    } catch {
      toast.error("Error al restaurar caja fuerte");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSafeBoxAction(id);
      toast.success("Caja fuerte eliminada");
      router.refresh();
    } catch {
      toast.error("Error al eliminar caja fuerte");
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="space-y-4">
        {/* Search and add button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-1 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                className="h-8 w-full pl-8"
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="order-1 flex items-center gap-2 self-end sm:order-2 sm:self-auto">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button onClick={openCreateSheet}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar caja fuerte
                  <div className="ml-2 hidden md:inline">
                    <kbd className="pointer-events-none hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-primary-foreground/30 px-1 font-sans text-xs font-medium md:inline-flex">
                      N
                    </kbd>
                  </div>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="sm:max-w-lg overflow-y-auto"
              >
                <SheetHeader>
                  <SheetTitle>
                    {editingSafeBox
                      ? "Editar caja fuerte"
                      : "Nueva caja fuerte"}
                  </SheetTitle>
                  <SheetDescription>
                    {editingSafeBox
                      ? "Modifica los datos de la caja fuerte."
                      : "Agrega una nueva caja fuerte para guardar efectivo."}
                  </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                  <div className="space-y-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ej: Caja fuerte principal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Ubicacion */}
                    <div className="space-y-2">
                      <Label htmlFor="warehouse-select">Ubicacion</Label>
                      <Select
                        value={selectedLocation}
                        onValueChange={setSelectedLocation}
                      >
                        <SelectTrigger id="warehouse-select">
                          <SelectValue placeholder="Sin ubicacion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin ubicacion</SelectItem>
                          {locations.map((location) => (
                            <SelectItem
                              key={location.id}
                              value={location.id}
                            >
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Moneda */}
                    <div className="space-y-2">
                      <Label htmlFor="currency-select">Moneda *</Label>
                      <Select
                        value={currency}
                        onValueChange={(value) =>
                          setCurrency(value as "ARS" | "USD")
                        }
                      >
                        <SelectTrigger id="currency-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                          <SelectItem value="USD">Dolares (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Saldo inicial */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Saldo inicial</h3>

                    <div className="space-y-2">
                      <Label>Monto *</Label>
                      <Input
                        placeholder="0"
                        type="text"
                        inputMode="numeric"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha *</Label>
                      <Input
                        type="date"
                        name="openingBalanceDate"
                        value={balanceDate}
                        onChange={(e) => setBalanceDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <SheetFooter className="gap-2 flex flex-col">
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading
                        ? "Guardando..."
                        : editingSafeBox
                          ? "Guardar cambios"
                          : "Crear caja fuerte"}
                    </Button>
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </SheetClose>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ubicacion</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Saldo inicial</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSafeBoxes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No se encontraron cajas fuertes
                  </TableCell>
                </TableRow>
              ) : (
                filteredSafeBoxes.map((safeBox) => (
                  <TableRow key={safeBox.id}>
                    <TableCell>
                      <span className="font-medium">{safeBox.name}</span>
                    </TableCell>
                    <TableCell>
                      <span>{safeBox.location?.name || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span>{safeBox.currency}</span>
                    </TableCell>
                    <TableCell>
                      <span>
                        $ {safeBox.initial_balance.toLocaleString("es-AR")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          safeBox.status === "active" ? "default" : "secondary"
                        }
                      >
                        {safeBox.status === "active" ? "Activa" : "Archivada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Abrir menu</span>
                              <Ellipsis className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditSheet(safeBox)}
                            >
                              Editar
                            </DropdownMenuItem>
                            {safeBox.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() => handleArchive(safeBox.id)}
                              >
                                Archivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleRestore(safeBox.id)}
                              >
                                Restaurar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(safeBox.id)}
                            >
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <div className="hidden flex-1 text-sm text-muted-foreground md:block">
            {filteredSafeBoxes.length}{" "}
            {filteredSafeBoxes.length === 1
              ? "caja fuerte"
              : "cajas fuertes"}
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Pagina 1 de 1
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              disabled
            >
              <span className="sr-only">Ir a la primera pagina</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled>
              <span className="sr-only">Ir a la pagina anterior</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled>
              <span className="sr-only">Ir a la pagina siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 lg:flex"
              disabled
            >
              <span className="sr-only">Ir a la ultima pagina</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
