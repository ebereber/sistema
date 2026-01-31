"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleOff,
  CirclePlus,
  CornerDownRight,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Tipos
interface Orden {
  id: string;
  numero: string;
  proveedor: string;
  fecha: string;
  fechaEntrega: string;
  estado:
    | "Borrador"
    | "Confirmada"
    | "Parcial"
    | "Recibida"
    | "Facturada"
    | "Cancelada";
  deposito: string;
}

// Estados disponibles
const estadosDisponibles = [
  { value: "Borrador", label: "Borrador", icon: CircleDashed },
  { value: "Confirmada", label: "Confirmada", icon: Circle },
  { value: "Parcial", label: "Parcial", icon: CircleEllipsis },
  { value: "Recibida", label: "Recibida", icon: CircleCheck },
  { value: "Facturada", label: "Facturada", icon: Circle },
  { value: "Cancelada", label: "Cancelada", icon: CircleOff },
];

// Función para obtener el icono y color del estado
const getEstadoBadge = (estado: Orden["estado"]) => {
  const config = {
    Borrador: { icon: CircleDashed, className: "text-muted-foreground" },
    Confirmada: { icon: Circle, className: "text-muted-foreground fill-muted" },
    Parcial: { icon: CircleEllipsis, className: "text-muted-foreground" },
    Recibida: { icon: CircleCheck, className: "text-green-500" },
    Facturada: { icon: Circle, className: "text-muted-foreground fill-muted" },
    Cancelada: { icon: CircleOff, className: "text-muted-foreground" },
  };

  const { icon: Icon, className } = config[estado];
  return (
    <Badge variant="outline">
      <Icon className={`${className}`} />
      {estado}
    </Badge>
  );
};

// Función para formatear fecha relativa
const formatearFechaRelativa = (fecha: string) => {
  const hoy = new Date();
  const fechaOrden = new Date(fecha);
  const diferencia = Math.floor(
    (hoy.getTime() - fechaOrden.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diferencia === 0) return "hoy";
  if (diferencia === 1) return "ayer";

  return fechaOrden.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
};

export default function OrdenesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estadosSeleccionados, setEstadosSeleccionados] = useState<string[]>([
    "Borrador",
  ]);
  const [filtroFechaOpen, setFiltroFechaOpen] = useState(false);
  const [filtroEstadoOpen, setFiltroEstadoOpen] = useState(false);

  // Filtros de fecha
  const [tipoFiltro, setTipoFiltro] = useState("en los últimos");
  const [valorFiltro, setValorFiltro] = useState("30");
  const [unidadFiltro, setUnidadFiltro] = useState("días");

  // Datos de ejemplo
  const ordenes: Orden[] = [
    {
      id: "4",
      numero: "OC-00000004",
      proveedor: "Sportline",
      fecha: "2026-01-31",
      fechaEntrega: "2026-02-12",
      estado: "Borrador",
      deposito: "Principal",
    },
    {
      id: "3",
      numero: "OC-00000003",
      proveedor: "Footwear Sa",
      fecha: "2026-01-29",
      fechaEntrega: "2026-01-30",
      estado: "Recibida",
      deposito: "Principal",
    },
    {
      id: "2",
      numero: "OC-00000002",
      proveedor: "Denim Co",
      fecha: "2026-01-29",
      fechaEntrega: "2026-01-31",
      estado: "Facturada",
      deposito: "Principal",
    },
    {
      id: "1",
      numero: "OC-00000001",
      proveedor: "Denim Co",
      fecha: "2026-01-29",
      fechaEntrega: "2026-01-31",
      estado: "Recibida",
      deposito: "Principal",
    },
  ];

  // Filtrar órdenes
  const ordenesFiltradas = ordenes.filter((orden) => {
    const coincideBusqueda =
      busqueda === "" ||
      orden.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      orden.proveedor.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado =
      estadosSeleccionados.length === 0 ||
      estadosSeleccionados.includes(orden.estado);

    return coincideBusqueda && coincideEstado;
  });

  const toggleEstado = (estado: string) => {
    setEstadosSeleccionados((prev) =>
      prev.includes(estado)
        ? prev.filter((e) => e !== estado)
        : [...prev, estado],
    );
  };

  return (
    <div className="flex flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Órdenes de compra</h2>
        <Link href="/ordenes/nueva">
          <Button>
            <Plus />
            Nueva orden de compra
            <kbd className="hidden md:inline-flex pointer-events-none select-none items-center justify-center gap-1 rounded-sm border border-primary-foreground/30 px-1 font-sans text-xs font-medium text-primary-foreground min-w-5 h-5">
              N
            </kbd>
          </Button>
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar órdenes…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Filtro de Fecha */}
              <Popover open={filtroFechaOpen} onOpenChange={setFiltroFechaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="h-8 justify-start border-dashed active:scale-100"
                  >
                    <Calendar className="size-4" />
                    Fecha
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[17rem]" align="start">
                  <div className="space-y-4 bg-card">
                    <div>
                      <Label className="text-sm font-semibold">
                        Filtrar por fecha
                      </Label>
                    </div>
                    <div className="space-y-3">
                      <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en los últimos">
                            en los últimos
                          </SelectItem>
                          <SelectItem value="antes de">antes de</SelectItem>
                          <SelectItem value="después de">después de</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1">
                        <CornerDownRight className="size-3.5 w-12 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            placeholder="30"
                            value={valorFiltro}
                            onChange={(e) => setValorFiltro(e.target.value)}
                            className="h-8 w-full"
                          />
                          <Select
                            value={unidadFiltro}
                            onValueChange={setUnidadFiltro}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="días">días</SelectItem>
                              <SelectItem value="semanas">semanas</SelectItem>
                              <SelectItem value="meses">meses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        className="w-full"
                        onClick={() => setFiltroFechaOpen(false)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Filtro de Estado */}
              <Popover
                open={filtroEstadoOpen}
                onOpenChange={setFiltroEstadoOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="h-8 justify-start border-dashed"
                  >
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Estado
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Filtrar por estado" />
                    <CommandList>
                      <CommandGroup>
                        {estadosDisponibles.map((estado) => {
                          const isSelected = estadosSeleccionados.includes(
                            estado.value,
                          );
                          const Icon = estado.icon;
                          return (
                            <CommandItem
                              key={estado.value}
                              onSelect={() => toggleEstado(estado.value)}
                              className="gap-2"
                            >
                              <div className="flex size-4 items-center justify-center rounded-[4px] border border-input [&_svg]:invisible">
                                <Check
                                  className={`size-3.5 text-primary-foreground ${
                                    isSelected ? "visible" : ""
                                  }`}
                                />
                              </div>
                              <Icon className="ml-2 size-4 text-muted-foreground" />
                              <span className="ml-2 truncate">
                                {estado.label}
                              </span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Nº Orden</TableHead>
                  <TableHead className="text-left">Proveedor</TableHead>
                  <TableHead className="text-left">Fecha</TableHead>
                  <TableHead className="text-left">Entrega Estimada</TableHead>
                  <TableHead className="text-left">Estado</TableHead>
                  <TableHead className="text-left">Depósito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenesFiltradas.map((orden) => (
                  <TableRow
                    key={orden.id}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="font-mono text-sm text-blue-500">
                        {orden.numero}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{orden.proveedor}</div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          {formatearFechaRelativa(orden.fecha)}
                        </TooltipTrigger>
                        <TooltipContent>{orden.fecha}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{orden.fechaEntrega}</div>
                    </TableCell>
                    <TableCell>{getEstadoBadge(orden.estado)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{orden.deposito}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between px-2">
            <div className="hidden flex-1 text-sm text-muted-foreground md:block">
              Mostrando {ordenesFiltradas.length} de {ordenes.length} resultados
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[150px] items-center justify-center text-sm font-medium">
                Página 1 de 1
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled
              >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled
              >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled
              >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden h-8 w-8 lg:flex"
                disabled
              >
                <span className="sr-only">Ir a la última página</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
