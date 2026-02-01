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
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  getPurchaseOrderById,
  receiveProducts,
  type PurchaseOrderWithDetails,
} from "@/lib/services/purchase-orders";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleEllipsis,
  CircleOff,
  Download,
  File,
  Loader2,
  Pencil,
  ReceiptText,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CircleDashed; className: string }
> = {
  draft: {
    label: "Borrador",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  confirmed: {
    label: "Confirmada",
    icon: CircleDashed,
    className: "text-muted-foreground",
  },
  partial: {
    label: "Parcial",
    icon: CircleEllipsis,
    className: "text-muted-foreground",
  },
  received: {
    label: "Recibida",
    icon: CircleCheck,
    className: "text-green-500",
  },
  invoiced: {
    label: "Facturada",
    icon: Circle,
    className: "text-muted-foreground fill-muted",
  },
  cancelled: {
    label: "Cancelada",
    icon: CircleOff,
    className: "text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant="outline">
      <Icon className={config.className} />
      {config.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  return format(date, "d MMM", { locale: es });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatHistoryDate(dateStr: string) {
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrdenDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Receive quantities temp state
  const [tempQuantities, setTempQuantities] = useState<Record<string, number>>(
    {},
  );

  // Loading states for actions
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await getPurchaseOrderById(id);
      setOrder(data);
    } catch {
      toast.error("Orden no encontrada");
      router.push("/ordenes");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmPurchaseOrder(id);
      toast.success("Orden confirmada");
      setConfirmDialogOpen(false);
      await loadOrder();
    } catch (error) {
      console.error(error);
      toast.error("Error al confirmar la orden");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleOpenReceiveDialog = () => {
    if (!order) return;
    const temp: Record<string, number> = {};
    order.items.forEach((item) => {
      temp[item.id] = item.quantity_received;
    });
    setTempQuantities(temp);
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    if (!order) return;
    setIsReceiving(true);
    try {
      const receivedItems = order.items.map((item) => ({
        itemId: item.id,
        quantityReceived: tempQuantities[item.id] || 0,
      }));
      await receiveProducts(id, receivedItems);
      toast.success("Recepción registrada");
      setReceiveDialogOpen(false);
      await loadOrder();
    } catch (error) {
      console.error(error);
      toast.error("Error al registrar recepción");
    } finally {
      setIsReceiving(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelPurchaseOrder(id);
      toast.success("Orden cancelada");
      setCancelDialogOpen(false);
      await loadOrder();
    } catch (error) {
      console.error(error);
      toast.error("Error al cancelar la orden");
    } finally {
      setIsCancelling(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  const status = order.status;
  const isDraft = status === "draft";
  const canReceive = status === "confirmed" || status === "partial";
  const showHistory = order.history.length > 0; // more than just "Creada"
  const isCancelled = status === "cancelled";

  const totalReceived = order.items.reduce(
    (s, i) => s + i.quantity_received,
    0,
  );
  const totalOrdered = order.items.reduce((s, i) => s + i.quantity, 0);

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
              <h1 className="text-3xl font-bold">{order.order_number}</h1>
              <StatusBadge status={status} />
            </div>
            <p className="text-lg text-muted-foreground">
              Orden a {order.supplier?.name || "—"}{" "}
              <Tooltip>
                <TooltipTrigger className="font-semibold text-primary">
                  {formatRelativeDate(order.order_date)}
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(order.order_date), "d 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </TooltipContent>
              </Tooltip>
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex gap-2">
            {/* More actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Más acciones
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(isDraft || status === "confirmed") && (
                  <DropdownMenuItem asChild>
                    <Link href={`/ordenes/${id}/editar`}>
                      <Pencil className="size-3.5" />
                      Editar
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => toast.info("Próximamente")}>
                  <Download />
                  Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <Archive className="size-3.5" />
                  Cancelar orden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirm (draft only) */}
            {isDraft && (
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
                    <AlertDialogCancel disabled={isConfirming}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirm}
                      disabled={isConfirming}
                    >
                      {isConfirming ? "Confirmando…" : "Confirmar orden"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Receive (confirmed/partial) */}
            {canReceive && (
              <Dialog
                open={receiveDialogOpen}
                onOpenChange={setReceiveDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button onClick={handleOpenReceiveDialog}>
                    Recibir productos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto lg:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Recibir productos</DialogTitle>
                    <DialogDescription>
                      Ingresá las cantidades recibidas para cada producto.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_auto] items-start gap-4 border-b pb-4 last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Input
                              type="number"
                              min="0"
                              value={tempQuantities[item.id] || 0}
                              onChange={(e) =>
                                setTempQuantities({
                                  ...tempQuantities,
                                  [item.id]: parseInt(e.target.value) || 0,
                                })
                              }
                              className="h-8 w-full text-center"
                            />
                          </div>
                          <div className="w-36">
                            <Progress
                              value={
                                ((tempQuantities[item.id] || 0) /
                                  item.quantity) *
                                100
                              }
                            />
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="font-medium">Recibido</span>
                              <span>
                                {tempQuantities[item.id] || 0} de{" "}
                                {item.quantity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" disabled={isReceiving}>
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button onClick={handleReceive} disabled={isReceiving}>
                      {isReceiving ? "Registrando…" : "Confirmar recepción"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Create invoice (after confirm) */}
            {!isDraft && (
              <Button asChild>
                <Link href={`/compras/nueva?purchaseOrderId=${id}`}>
                  <ReceiptText />
                  Crear factura
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Left Column - Products */}
        <div className="space-y-6 lg:col-span-3">
          {/* Order info strip */}
          <Card className="bg-muted p-4">
            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
              <div className="flex items-center gap-2">
                <File className="size-4 text-muted-foreground" />
                <span className="font-medium">{order.order_number}</span>
              </div>
              {order.expected_delivery_date && (
                <div className="text-sm text-muted-foreground">
                  Fecha estimada:{" "}
                  {format(
                    new Date(order.expected_delivery_date),
                    "d 'de' MMMM 'de' yyyy",
                    { locale: es },
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                Depósito:{" "}
                <span className="text-primary">
                  {order.location?.name || "—"}
                </span>
              </CardDescription>
              {!isDraft && (
                <div className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 self-start justify-self-end text-xs text-muted-foreground">
                  <Progress
                    value={(totalReceived / totalOrdered) * 100}
                    className="w-36"
                  />
                  <div>
                    {totalReceived} / {totalOrdered}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div>
                {order.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`py-4 ${
                      index !== order.items.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {item.product_id ? (
                            <Link
                              href={`/productos/${item.product_id}`}
                              className="text-base font-medium underline-offset-4 transition-colors hover:underline"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="text-base font-medium">
                              {item.name}
                            </span>
                          )}
                        </div>
                        {item.sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-base font-medium">
                          {formatCurrency(Number(item.unit_cost))}
                        </div>
                        <Badge variant="outline" className="font-mono text-sm">
                          {item.quantity}
                        </Badge>
                        {!isDraft && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="font-medium">Recibido:</span>
                            <span className="font-mono">
                              {item.quantity_received}/{item.quantity}
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
                      {formatCurrency(Number(order.total))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="col-span-2 space-y-6">
          {/* Supplier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.supplier ? (
                <Link
                  href={`/proveedores/${order.supplier.id}`}
                  className="text-lg font-semibold text-primary hover:underline"
                >
                  {order.supplier.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="size-4 text-muted-foreground" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          {showHistory && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de cambios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex gap-4 pb-4 justify-between items-start ${
                        index !== order.history.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">{entry.action}</p>
                        {entry.user?.name && (
                          <p className="text-xs text-muted-foreground">
                            por {entry.user.name}
                          </p>
                        )}
                        {entry.field_name && (
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex gap-2 text-muted-foreground">
                              <span className="font-medium">
                                {entry.field_name}:
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="line-through">
                                  {entry.old_value}
                                </span>
                                <ArrowRight className="size-3" />
                                <span>{entry.new_value}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-1 flex items-center justify-between gap-2">
                        {/*  <p className="text-sm font-medium">{entry.action}</p> */}
                        <span className="text-sm text-muted-foreground">
                          {formatHistoryDate(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar orden de compra?</AlertDialogTitle>
            <AlertDialogDescription>
              La orden {order.order_number} será marcada como cancelada. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelando…" : "Cancelar orden"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
