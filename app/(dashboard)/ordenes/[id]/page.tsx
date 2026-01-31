"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Download,
  File,
  Pencil,
  ReceiptText,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// Tipos
interface Producto {
  id: string;
  nombre: string;
  sku: string;
  precio: number;
  cantidadOrdenada: number;
  cantidadRecibida: number;
}

interface HistorialCambio {
  tipo: "Creada" | "Actualizada";
  fecha: string;
  usuario: string;
  cambios?: {
    campo: string;
    anterior: string;
    nuevo: string;
  };
}

/**
 * FLUJO DE LA ORDEN DE COMPRA:
 *
 * 1. BORRADOR (estado inicial)
 *    - Botón "Confirmar orden" visible
 *    - Al confirmar: se abre AlertDialog de confirmación
 *
 * 2. CONFIRMADA (después de confirmar)
 *    - Se agrega entrada al historial de cambios (Borrador → Confirmada)
 *    - Botón "Confirmar orden" desaparece
 *    - Aparece botón "Recibir productos"
 *    - Aparece botón "Crear factura" (link a /compras/nueva?purchaseOrderId=...)
 *
 * 3. RECIBIR PRODUCTOS (Dialog)
 *    - Usuario ingresa cantidades recibidas para cada producto
 *    - Si TODOS los productos están completos (recibido === ordenado):
 *      → Estado cambia a "Recibida"
 *      → Botón "Recibir productos" desaparece
 *      → Solo quedan: "Más acciones" y "Crear factura"
 *    - Si NO todos están completos (recibido < ordenado):
 *      → Estado cambia a "Parcial"
 *      → Botón "Recibir productos" permanece visible
 *      → Se puede seguir recibiendo productos
 *
 * 4. HISTORIAL DE CAMBIOS
 *    - Se muestra solo después de confirmar la orden
 *    - Registra: Creación y cambios de estado
 */

export default function OrdenDetallesPage() {
  const params = useParams();
  // Estado inicial: Borrador
  const [estado, setEstado] = useState<
    "Borrador" | "Confirmada" | "Parcial" | "Recibida"
  >("Borrador");
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);

  // Datos de ejemplo
  const [orden] = useState({
    numero: "OC-00000004",
    proveedor: {
      id: "d3c11656-0ae5-4ab7-9584-01c389ecd7b4",
      nombre: "Sportline",
    },
    fecha: "2026-01-31",
    fechaEntrega: "2026-02-12",
    deposito: "Principal",
    notas: "nota de orden",
    total: 138.0,
  });

  const [productos, setProductos] = useState<Producto[]>([
    {
      id: "1",
      nombre: "Botas de Cuero Negro",
      sku: "BT-006",
      precio: 35.0,
      cantidadOrdenada: 1,
      cantidadRecibida: 0,
    },
    {
      id: "2",
      nombre: "Camisa Lino Blanca",
      sku: "CM-005",
      precio: 18.0,
      cantidadOrdenada: 1,
      cantidadRecibida: 0,
    },
    {
      id: "3",
      nombre: "Campera de Abrigo Puffer",
      sku: "CP-007",
      precio: 40.0,
      cantidadOrdenada: 1,
      cantidadRecibida: 0,
    },
    {
      id: "4",
      nombre: "Nike Air Max Plus",
      sku: "12345",
      precio: 45.0,
      cantidadOrdenada: 1,
      cantidadRecibida: 0,
    },
  ]);

  const [historial, setHistorial] = useState<HistorialCambio[]>([
    {
      tipo: "Creada",
      fecha: "31/01/2026 22:24",
      usuario: "vos",
    },
  ]);

  // Cantidades temporales para el dialog de recibir productos
  const [cantidadesTemp, setCantidadesTemp] = useState<{
    [key: string]: number;
  }>({});

  // Handlers
  const handleConfirmarOrden = () => {
    setEstado("Confirmada");
    setMostrarHistorial(true);

    // Agregar cambio al historial
    setHistorial((prev) => [
      {
        tipo: "Actualizada",
        fecha: new Date().toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        usuario: "vos",
        cambios: {
          campo: "Estado",
          anterior: "Borrador",
          nuevo: "Confirmada",
        },
      },
      ...prev,
    ]);

    setConfirmDialogOpen(false);
  };

  const handleOpenReceiveDialog = () => {
    // Inicializar cantidades temporales con las actuales
    const temp: { [key: string]: number } = {};
    productos.forEach((p) => {
      temp[p.id] = p.cantidadRecibida;
    });
    setCantidadesTemp(temp);
    setReceiveDialogOpen(true);
  };

  const handleConfirmarRecepcion = () => {
    // Actualizar productos con las cantidades recibidas
    const productosActualizados = productos.map((p) => ({
      ...p,
      cantidadRecibida: cantidadesTemp[p.id] || 0,
    }));

    setProductos(productosActualizados);

    // Verificar si todos los productos están completos
    const todosCompletos = productosActualizados.every(
      (p) => p.cantidadRecibida >= p.cantidadOrdenada,
    );

    const nuevoEstado = todosCompletos ? "Recibida" : "Parcial";
    setEstado(nuevoEstado);

    // Agregar al historial
    setHistorial((prev) => [
      {
        tipo: "Actualizada",
        fecha: new Date().toLocaleString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        usuario: "vos",
        cambios: {
          campo: "Estado",
          anterior: estado,
          nuevo: nuevoEstado,
        },
      },
      ...prev,
    ]);

    setReceiveDialogOpen(false);
  };

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

  const getEstadoBadge = () => {
    const config = {
      Borrador: { icon: CircleDashed, className: "text-muted-foreground" },
      Confirmada: { icon: CircleDashed, className: "text-muted-foreground" },
      Parcial: { icon: CircleDashed, className: "text-muted-foreground" },
      Recibida: { icon: CircleCheck, className: "text-green-500" },
    };

    const { icon: Icon, className } = config[estado];
    return (
      <Badge variant="outline">
        <Icon className={className} />
        {estado}
      </Badge>
    );
  };

  const calcularProgreso = (producto: Producto) => {
    return (producto.cantidadRecibida / producto.cantidadOrdenada) * 100;
  };

  const totalRecibido = productos.reduce(
    (sum, p) => sum + p.cantidadRecibida,
    0,
  );
  const totalOrdenado = productos.reduce(
    (sum, p) => sum + p.cantidadOrdenada,
    0,
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/ordenes"
            className="flex items-center gap-1.5 text-muted-foreground hover:underline"
          >
            Órdenes de compra
            <ChevronRight className="size-3" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{orden.numero}</h1>
              {getEstadoBadge()}
            </div>
            <p className="text-lg text-muted-foreground">
              Orden a {orden.proveedor.nombre}{" "}
              <Tooltip>
                <TooltipTrigger className="font-semibold text-primary">
                  {formatearFechaRelativa(orden.fecha)}
                </TooltipTrigger>
                <TooltipContent>{orden.fecha}</TooltipContent>
              </Tooltip>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            {/* Dropdown "Más acciones" */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Más acciones
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href={`/ordenes/${params.id}/editar`}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download />
                  Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Archive className="size-3.5" />
                  Cancelar orden de compra
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botón "Confirmar orden" - Solo visible en estado Borrador */}
            {estado === "Borrador" && (
              <AlertDialog
                open={confirmDialogOpen}
                onOpenChange={setConfirmDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button>Confirmar orden</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar orden?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirmar la orden no modifica el stock. Vas a tener una
                      opción para recibir los productos de tu proveedor luego.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmarOrden}>
                      Confirmar orden
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Botón "Recibir productos" - Visible en Confirmada y Parcial */}
            {(estado === "Confirmada" || estado === "Parcial") && (
              <Dialog
                open={receiveDialogOpen}
                onOpenChange={setReceiveDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={handleOpenReceiveDialog}>
                    Recibir productos
                  </Button>
                </DialogTrigger>
                <DialogContent className="lg:max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Recibir productos</DialogTitle>
                    <DialogDescription>
                      Ingresá las cantidades recibidas para cada producto. Podés
                      recibir más o menos de lo ordenado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {productos.map((producto) => (
                      <div
                        key={producto.id}
                        className="grid grid-cols-[1fr_auto] items-start gap-4 border-b pb-4 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">{producto.nombre}</div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {producto.sku}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Input
                              type="number"
                              min="0"
                              value={cantidadesTemp[producto.id] || 0}
                              onChange={(e) =>
                                setCantidadesTemp({
                                  ...cantidadesTemp,
                                  [producto.id]: parseInt(e.target.value) || 0,
                                })
                              }
                              className="h-8 w-full text-center"
                            />
                          </div>
                          <div className="mt-2 w-36">
                            <Progress
                              value={
                                ((cantidadesTemp[producto.id] || 0) /
                                  producto.cantidadOrdenada) *
                                100
                              }
                            />
                            <div className="mt-1 flex items-center justify-between space-x-1 pr-0.5 text-right text-xs text-muted-foreground">
                              <span className="font-medium">Recibido</span>
                              <div>
                                {cantidadesTemp[producto.id] || 0}
                                <span className="text-muted-foreground">
                                  {" "}
                                  de {producto.cantidadOrdenada}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleConfirmarRecepcion}>
                      Confirmar recepción
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Botón "Crear factura" - Visible después de confirmar */}
            {estado !== "Borrador" && (
              <Link href={`/compras/nueva?purchaseOrderId=${params.id}`}>
                <Button>
                  <ReceiptText />
                  Crear factura
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Left Column - Productos */}
        <div className="space-y-6 lg:col-span-3">
          {/* Order Info Card */}
          <Card className="bg-muted p-4">
            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
              <div className="flex w-full items-center justify-between gap-2 md:w-auto">
                <div className="flex items-center gap-2">
                  <File className="size-4 text-muted-foreground" />
                  <span className="font-medium">{orden.numero}</span>
                </div>
              </div>
              <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row">
                <div className="text-sm text-muted-foreground">
                  Fecha estimada: {orden.fechaEntrega}
                </div>
              </div>
            </div>
          </Card>

          {/* Products Card */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                Depósito: <span className="text-primary">{orden.deposito}</span>
              </CardDescription>
              {estado !== "Borrador" && (
                <div className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 self-start justify-self-end text-xs text-muted-foreground">
                  <Progress
                    value={(totalRecibido / totalOrdenado) * 100}
                    className="w-36"
                  />
                  <div className="text-muted-foreground">
                    {totalRecibido} / {totalOrdenado}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div>
                {productos.map((producto, index) => (
                  <div
                    key={producto.id}
                    className={`py-4 ${
                      index !== productos.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Link
                            href={`/productos/${producto.id}`}
                            className="text-base font-medium underline-offset-4 transition-colors hover:underline"
                          >
                            {producto.nombre}
                          </Link>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {producto.sku}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-medium">
                          $ {producto.precio.toFixed(2)}
                        </div>
                        <Badge variant="outline" className="font-mono text-sm">
                          {producto.cantidadOrdenada}
                        </Badge>
                        {estado !== "Borrador" && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="font-medium">Recibido:</span>
                            <span className="font-mono">
                              {producto.cantidadRecibida}/
                              {producto.cantidadOrdenada}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold md:text-lg">
                      Costo esperado total
                    </span>
                    <span className="font-bold md:text-xl">
                      $ {orden.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info Cards */}
        <div className="col-span-2 space-y-6">
          {/* Proveedor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={`/proveedores/${orden.proveedor.id}`}
                  className="px-0 text-lg font-semibold text-primary hover:underline"
                >
                  {orden.proveedor.nombre}
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Notas Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="size-4 text-muted-foreground" />
                  Notas
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-8">
                <span className="text-muted-foreground">{orden.notas}</span>
              </div>
            </CardContent>
          </Card>

          {/* Historial Card - Solo se muestra después de confirmar */}
          {mostrarHistorial && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de cambios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historial.map((cambio, index) => (
                    <div
                      key={index}
                      className={`flex gap-4 pb-4 ${
                        index !== historial.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{cambio.tipo}</p>
                          <span className="text-sm text-muted-foreground">
                            {cambio.fecha}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          por {cambio.usuario}
                        </p>
                        {cambio.cambios && (
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex gap-2 text-muted-foreground">
                              <span className="font-medium">
                                {cambio.cambios.campo}:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="line-through">
                                  {cambio.cambios.anterior}
                                </span>
                                <ArrowRight className="size-3" />
                                <span>{cambio.cambios.nuevo}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
