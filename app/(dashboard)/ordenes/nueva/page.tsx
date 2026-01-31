"use client";

import { SupplierDialog } from "@/components/proveedores/supplier-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Supplier } from "@/lib/services/suppliers";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Tipos
interface Proveedor {
  id: string;
  nombre: string;
  dni?: string;
}

interface Ubicacion {
  id: string;
  nombre: string;
  isPredeterminada: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  sku: string;
  costo: number;
}

interface ItemOrden {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  costoSinIVA: number;
}

// Datos de ejemplo
const proveedoresData: Proveedor[] = [
  { id: "1", nombre: "Denim Co" },
  { id: "2", nombre: "Footwear Sa" },
  { id: "3", nombre: "Leather Goods" },
  { id: "4", nombre: "Moda Chic" },
  { id: "5", nombre: "Nike", dni: "12345678" },
  { id: "6", nombre: "Sportline" },
  { id: "7", nombre: "Textil Sur" },
  { id: "8", nombre: "Winter Style" },
];

const ubicacionesData: Ubicacion[] = [
  { id: "1", nombre: "Principal", isPredeterminada: true },
  { id: "2", nombre: "Depósito", isPredeterminada: false },
];

const productosData: Producto[] = [
  { id: "1", nombre: "Buzo Hoodie con Capucha", sku: "BZ-009", costo: 14 },
  { id: "2", nombre: "Camisa Lino Blanca", sku: "CM-005", costo: 18 },
  { id: "3", nombre: "Botas de Cuero Negro", sku: "BT-006", costo: 35 },
  { id: "4", nombre: "Billetera de Cuero", sku: "BI-019", costo: 64 },
  { id: "5", nombre: "Cinturón de Cuero", sku: "AC-015", costo: 6 },
  { id: "6", nombre: "Gorra Trucker", sku: "GR-016", costo: 3.5 },
];

export default function NuevaOrdenPage() {
  const [openProveedor, setOpenProveedor] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] =
    useState<Proveedor | null>(null);
  const [searchProveedor, setSearchProveedor] = useState("");

  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(
    ubicacionesData.find((u) => u.isPredeterminada)?.id || "",
  );

  // Data from DB
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [openSupplier, setOpenSupplier] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const [fechaOrden, setFechaOrden] = useState<Date>(new Date());
  const [openFechaOrden, setOpenFechaOrden] = useState(false);

  const [fechaEntrega, setFechaEntrega] = useState<Date | undefined>(undefined);
  const [openFechaEntrega, setOpenFechaEntrega] = useState(false);

  const [items, setItems] = useState<ItemOrden[]>([
    {
      productoId: "1",
      nombre: "Buzo Hoodie con Capucha",
      sku: "BZ-009",
      cantidad: 1,
      costoSinIVA: 14,
    },
    {
      productoId: "2",
      nombre: "Camisa Lino Blanca",
      sku: "CM-005",
      cantidad: 1,
      costoSinIVA: 18,
    },
    {
      productoId: "3",
      nombre: "Botas de Cuero Negro",
      sku: "BT-006",
      cantidad: 1,
      costoSinIVA: 35,
    },
    {
      productoId: "4",
      nombre: "Billetera de Cuero",
      sku: "BI-019",
      cantidad: 1,
      costoSinIVA: 64,
    },
    {
      productoId: "5",
      nombre: "Cinturón de Cuero",
      sku: "AC-015",
      cantidad: 1,
      costoSinIVA: 6,
    },
    {
      productoId: "6",
      nombre: "Gorra Trucker",
      sku: "GR-016",
      cantidad: 1,
      costoSinIVA: 3.5,
    },
  ]);

  const [notas, setNotas] = useState("");

  const proveedoresFiltrados = proveedoresData.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(searchProveedor.toLowerCase()) ||
      (proveedor.dni && proveedor.dni.includes(searchProveedor)),
  );

  const handleProveedorSelect = (proveedor: Proveedor) => {
    setProveedorSeleccionado(proveedor);
    setOpenProveedor(false);
    setSearchProveedor("");
  };

  const handleCantidadChange = (index: number, valor: string) => {
    const nuevaCantidad = parseFloat(valor) || 0;
    const nuevosItems = [...items];
    nuevosItems[index].cantidad = nuevaCantidad;
    setItems(nuevosItems);
  };

  const handleCostoChange = (index: number, valor: string) => {
    const nuevoCosto = parseFloat(valor) || 0;
    const nuevosItems = [...items];
    nuevosItems[index].costoSinIVA = nuevoCosto;
    setItems(nuevosItems);
  };

  const handleEliminarItem = (index: number) => {
    const nuevosItems = items.filter((_, i) => i !== index);
    setItems(nuevosItems);
  };

  const handleSupplierCreated = (supplier: Supplier) => {
    // Agregar a la lista y ordenar
    setSuppliers((prev) =>
      [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    // Seleccionarlo
    setSelectedSupplierId(supplier.id);
    // Cerrar el popover de proveedores
    setOpenSupplier(false);
  };

  const calcularSubtotal = (item: ItemOrden) => {
    return item.cantidad * item.costoSinIVA;
  };

  const calcularTotalUnidades = () => {
    return items.reduce((acc, item) => acc + item.cantidad, 0);
  };

  const calcularTotal = () => {
    return items.reduce((acc, item) => acc + calcularSubtotal(item), 0);
  };

  const formatearMoneda = (monto: number): string => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    })
      .format(monto)
      .replace("ARS", "$");
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header con breadcrumb */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/ordenes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Órdenes de Compra
            <ChevronRight className="size-3" />
          </Link>
          <h1 className="text-3xl font-bold">Nueva orden de compra</h1>
        </div>
      </div>

      <form className="space-y-6">
        <div className="gap-6">
          <div className="space-y-6">
            {/* Grid con las 2 cards superiores */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Card Proveedor */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-4">
                      <Label>Proveedor *</Label>
                      <Popover
                        open={openProveedor}
                        onOpenChange={setOpenProveedor}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openProveedor}
                            className="w-full min-w-xs justify-start text-left active:scale-100"
                          >
                            <span className="truncate">
                              {proveedorSeleccionado
                                ? proveedorSeleccionado.nombre
                                : "Seleccionar proveedor"}
                            </span>
                            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Buscá por nombre o DNI/CUIT…"
                              value={searchProveedor}
                              onValueChange={setSearchProveedor}
                            />
                            <CommandList>
                              <CommandEmpty>
                                No se encontraron proveedores
                              </CommandEmpty>
                              <CommandGroup>
                                <SupplierDialog
                                  mode="create"
                                  onSuccess={handleSupplierCreated}
                                  trigger={
                                    <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
                                      <Plus className="h-4 w-4" />
                                      <span className="font-medium">
                                        Crear nuevo proveedor
                                      </span>
                                    </div>
                                  }
                                />
                              </CommandGroup>
                              <CommandGroup heading="Proveedores">
                                {proveedoresFiltrados.map((proveedor) => (
                                  <CommandItem
                                    key={proveedor.id}
                                    value={proveedor.nombre}
                                    onSelect={() =>
                                      handleProveedorSelect(proveedor)
                                    }
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">
                                        {proveedor.nombre}
                                      </div>
                                      <div className="line-clamp-1 text-sm text-muted-foreground">
                                        {proveedor.dni
                                          ? `DNI ${proveedor.dni}`
                                          : "Sin DNI/CUIL informado"}
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Ubicación de entrega *</Label>
                      <Select
                        value={ubicacionSeleccionada}
                        onValueChange={setUbicacionSeleccionada}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ubicacionesData.map((ubicacion) => (
                            <SelectItem key={ubicacion.id} value={ubicacion.id}>
                              {ubicacion.nombre}
                              {ubicacion.isPredeterminada &&
                                " (Predeterminado)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Fechas */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="order-date">Fecha de orden *</Label>
                    <Popover
                      open={openFechaOrden}
                      onOpenChange={setOpenFechaOrden}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="order-date"
                          variant="outline"
                          className="w-full justify-start text-left font-normal active:scale-100"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(fechaOrden, "d 'de' MMMM 'de' yyyy", {
                            locale: es,
                          })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fechaOrden}
                          onSelect={(date) => {
                            if (date) {
                              setFechaOrden(date);
                              setOpenFechaOrden(false);
                            }
                          }}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected-date">
                      Fecha de entrega estimada
                    </Label>
                    <Popover
                      open={openFechaEntrega}
                      onOpenChange={setOpenFechaEntrega}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="expected-date"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal active:scale-100",
                            !fechaEntrega && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fechaEntrega
                            ? format(fechaEntrega, "d 'de' MMMM 'de' yyyy", {
                                locale: es,
                              })
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={fechaEntrega}
                          onSelect={(date) => {
                            setFechaEntrega(date);
                            setOpenFechaEntrega(false);
                          }}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mostrar el resto solo si hay proveedor seleccionado */}
            {proveedorSeleccionado && (
              <>
                {/* Card con tabla de productos */}
                {/*  si no hay productos mostrar el boton */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-left">
                                Producto
                              </TableHead>
                              <TableHead className="w-28 text-right">
                                Cantidad
                              </TableHead>
                              <TableHead className="w-32 text-right">
                                Costo s/IVA
                              </TableHead>
                              <TableHead className="w-32 text-right">
                                Subtotal
                              </TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, index) => (
                              <TableRow key={item.productoId} className="group">
                                <TableCell>
                                  <div className="max-w-xl whitespace-normal font-medium">
                                    {item.nombre}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    SKU: {item.sku}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={item.cantidad}
                                    onChange={(e) =>
                                      handleCantidadChange(
                                        index,
                                        e.target.value,
                                      )
                                    }
                                    className="text-right"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0,00"
                                    value={item.costoSinIVA}
                                    onChange={(e) =>
                                      handleCostoChange(index, e.target.value)
                                    }
                                    className="text-right"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatearMoneda(calcularSubtotal(item))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEliminarItem(index)}
                                    className="opacity-0 transition-all duration-200 group-hover:opacity-100"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-start gap-2">
                        <Button variant="outline" size="lg" type="button">
                          Agregar producto
                          <kbd className="pointer-events-none ml-2 hidden h-5 min-w-5 select-none items-center justify-center rounded-sm border px-1 font-sans text-xs font-medium md:inline-flex">
                            P
                          </kbd>
                        </Button>
                      </div>

                      <div className="flex justify-end">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            <span>{calcularTotalUnidades()} unidades</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid inferior con notas y total */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Card Notas */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea
                          name="notes"
                          placeholder="Notas adicionales (opcional)"
                          rows={4}
                          value={notas}
                          onChange={(e) => setNotas(e.target.value)}
                          className="min-h-16"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Total */}
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between text-lg font-medium">
                        <span>Total</span>
                        <span>{formatearMoneda(calcularTotal())}</span>
                      </div>
                      <div className="pt-4">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Button
                              type="submit"
                              size="lg"
                              className="h-12 w-full text-base"
                            >
                              Guardar borrador
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
