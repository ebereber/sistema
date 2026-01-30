"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight,
  CircleX,
  Download,
  Loader2,
  Receipt,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AddNoteDialog } from "@/components/ventas/add-note-dialog";
import {
  cancelSupplierPayment,
  getSupplierPaymentById,
  updatePaymentNotes,
  type SupplierPayment,
} from "@/lib/services/supplier-payments";

export default function PagoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  // Data
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [tempNote, setTempNote] = useState("");

  // Load payment
  const loadPayment = useCallback(async () => {
    try {
      const data = await getSupplierPaymentById(paymentId);
      if (data) {
        setPayment(data);
      } else {
        toast.error("Pago no encontrado");
        router.push("/pagos");
      }
    } catch (error) {
      console.error("Error loading payment:", error);
      toast.error("Error al cargar el pago");
      router.push("/pagos");
    } finally {
      setIsLoading(false);
    }
  }, [paymentId, router]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  // Handlers
  const handleCancel = async () => {
    if (!payment) return;

    setIsCancelling(true);
    try {
      await cancelSupplierPayment(payment.id);
      toast.success("Pago anulado correctamente");
      setCancelDialogOpen(false);
      loadPayment(); // Reload to show updated status
    } catch (error) {
      console.error("Error cancelling payment:", error);
      const message =
        error instanceof Error ? error.message : "Error al anular el pago";
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenNoteDialog = () => {
    setTempNote(payment?.notes || "");
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!payment) return;

    try {
      await updatePaymentNotes(payment.id, tempNote || null);
      setPayment({ ...payment, notes: tempNote || null });
      toast.success(tempNote ? "Nota guardada" : "Nota eliminada");
      setNoteDialogOpen(false);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error al guardar la nota");
    }
  };

  // Format helpers
  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0,00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "hoy";
    if (diffDays === 1) return "ayer";
    return format(date, "dd/MM/yyyy", { locale: es });
  };

  const formatFullDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  const isCancelled = payment.status === "cancelled";
  const totalAllocations =
    payment.allocations?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
  const totalMethods =
    payment.payment_methods?.reduce((sum, m) => sum + Number(m.amount), 0) || 0;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/pagos"
            className="inline-flex items-center gap-1.5 px-0 text-sm text-muted-foreground hover:underline"
          >
            Pagos
            <ChevronRight className="size-3" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                {formatCurrency(Number(payment.total_amount))}
              </h1>
              {isCancelled && <Badge variant="destructive">Anulado</Badge>}
            </div>
            <p className="text-lg text-muted-foreground">
              Pagado a{" "}
              <Link
                href={`/proveedores/${payment.supplier?.id}`}
                className="font-semibold text-primary hover:underline"
              >
                {payment.supplier?.name}
              </Link>{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-semibold text-primary">
                      {formatRelativeDate(payment.payment_date)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatFullDate(payment.payment_date)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>

        {!isCancelled && (
          <Button
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
          >
            <CircleX className="mr-2 h-4 w-4" />
            Anular pago
          </Button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Columna Principal */}
        <div className="space-y-6 lg:col-span-3">
          {/* Recibo */}
          <Card className="bg-muted">
            <div className="flex items-center justify-between gap-2 p-4">
              <div className="flex items-center gap-2">
                <Receipt className="hidden size-4 text-muted-foreground md:block" />
                <span className="font-mono">{payment.payment_number}</span>
              </div>
              <Button variant="outline" size="default" disabled>
                <Download className="mr-2 size-4" />
                Descargar
              </Button>
            </div>
          </Card>

          {/* Comprobantes Pagados */}
          {payment.allocations && payment.allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Comprobantes pagados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comprobante</TableHead>
                        <TableHead className="text-right">Aplicado</TableHead>
                        <TableHead className="text-right">
                          Total compra
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payment.allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Link
                                href={`/compras/${allocation.purchase_id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {allocation.purchase?.voucher_number || "-"}
                              </Link>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeDate(
                                  allocation.purchase?.invoice_date || null,
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(allocation.amount))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              Number(allocation.purchase?.total || 0),
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totalAllocations)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pago a cuenta */}
          {Number(payment.on_account_amount) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pago a cuenta</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pago a cuenta de{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Number(payment.on_account_amount))}
                  </span>{" "}
                  para aplicar a futuras facturas.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Métodos de Pago */}
          {payment.payment_methods && payment.payment_methods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Métodos de pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payment.payment_methods.map((method, index) => (
                    <div
                      key={method.id}
                      className={`space-y-1 ${
                        index < payment.payment_methods!.length - 1
                          ? "border-b pb-4"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {method.method_name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(Number(method.amount))}
                        </span>
                      </div>
                      {method.reference && (
                        <p className="text-sm text-muted-foreground">
                          {method.reference}
                        </p>
                      )}
                      {method.cash_register && (
                        <p className="text-sm text-muted-foreground">
                          Caja: {method.cash_register.name}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">
                      {formatCurrency(totalMethods)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Lateral */}
        <div className="space-y-6 lg:col-span-2">
          {/* Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/proveedores/${payment.supplier?.id}`}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {payment.supplier?.name}
              </Link>
              {payment.supplier?.tax_id && (
                <p className="text-sm text-muted-foreground">
                  CUIT: {payment.supplier.tax_id}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                Notas
              </CardTitle>
              {!isCancelled && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-6 py-0 text-muted-foreground"
                  onClick={handleOpenNoteDialog}
                >
                  {payment.notes ? "Editar" : "Agregar"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className={payment.notes ? "" : "text-muted-foreground"}>
                {payment.notes || "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Anular */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular pago</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se revertirán los saldos de las
              compras asociadas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{payment.payment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-medium">
                  {formatCurrency(Number(payment.total_amount))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor</span>
                <span className="font-medium">{payment.supplier?.name}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Anular pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <AddNoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        note={tempNote}
        onNoteChange={setTempNote}
        onSave={handleSaveNote}
      />
    </div>
  );
}
