"use client";

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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  cancelCustomerPayment,
  getCustomerPaymentById,
  updateCustomerPaymentNotes,
  type CustomerPaymentWithDetails,
} from "@/lib/services/customer-payments";
import {
  ChevronRight,
  CreditCard,
  Download,
  Ellipsis,
  FileText,
  Loader2,
  Receipt,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "hoy";
  if (isYesterday) return "ayer";

  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatFullDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function CobranzaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [payment, setPayment] = useState<CustomerPaymentWithDetails | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [tempNote, setTempNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    async function loadPayment() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getCustomerPaymentById(id);
        if (!data) {
          router.push("/cobranzas");
          return;
        }
        setPayment(data);
        setTempNote(data.notes || "");
      } catch (err) {
        console.error("Error loading payment:", err);
        setError("Error al cargar la cobranza");
      } finally {
        setIsLoading(false);
      }
    }

    loadPayment();
  }, [id, router]);

  const handleCancel = async () => {
    if (!payment) return;

    setIsCancelling(true);
    try {
      await cancelCustomerPayment(payment.id);
      toast.success("Cobranza anulada correctamente");
      // Reload payment
      const updated = await getCustomerPaymentById(id);
      setPayment(updated);
      setCancelDialogOpen(false);
    } catch (err) {
      console.error("Error cancelling payment:", err);
      toast.error("Error al anular la cobranza");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSaveNote = async () => {
    if (!payment) return;

    setIsSavingNote(true);
    try {
      await updateCustomerPaymentNotes(payment.id, tempNote || null);
      setPayment((prev) =>
        prev ? { ...prev, notes: tempNote || null } : null,
      );
      toast.success("Nota actualizada");
      setNoteDialogOpen(false);
    } catch (err) {
      console.error("Error saving note:", err);
      toast.error("Error al guardar la nota");
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !payment) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg text-muted-foreground">
          {error || "Cobranza no encontrada"}
        </p>
        <Button asChild>
          <Link href="/cobranzas">Volver a cobranzas</Link>
        </Button>
      </div>
    );
  }

  const isCancelled = payment.status === "cancelled";

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/cobranzas"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:underline"
          >
            Cobranzas
            <ChevronRight className="size-3" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">
                {formatCurrency(payment.total_amount)}
              </h1>
              {isCancelled && (
                <span className="rounded bg-destructive/10 px-2 py-1 text-sm font-medium text-destructive">
                  Anulado
                </span>
              )}
            </div>
            <p className="text-lg text-muted-foreground">
              Cobrado a {payment.customer?.name || "Sin cliente"}{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="font-semibold text-primary">
                    {formatDate(payment.payment_date)}
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatFullDate(payment.payment_date)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex w-fit items-stretch gap-0" role="group">
            <Button
              variant="default"
              size="sm"
              className="rounded-r-none"
              disabled
            >
              <Download className="mr-2 size-4" />
              Descargar
            </Button>
            <div className="relative">
              <Button
                variant="default"
                size="icon"
                className="size-8 rounded-l-none"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Ellipsis className="size-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-lg border bg-popover p-1 shadow-md">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setCancelDialogOpen(true);
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    Anular
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Receipt number */}
          <div className="flex flex-col gap-4 rounded-xl bg-muted p-4 text-sm ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" />
                <span>Recibo {payment.payment_number}</span>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Download className="mr-2 size-4" />
                Descargar
              </Button>
            </div>
          </div>

          {/* Allocated sales */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Comprobantes cobrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-right">Aplicado</TableHead>
                      <TableHead className="text-right">Total venta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payment.allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/ventas/${allocation.sale_id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {allocation.sale?.sale_number ||
                                allocation.sale_id}
                            </Link>
                            {allocation.sale?.sale_date && (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(allocation.sale.sale_date)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(allocation.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {allocation.sale
                            ? formatCurrency(allocation.sale.total)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payment methods */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                Métodos de pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.methods.map((method) => (
                <div key={method.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{method.method_name}</span>
                    <span className="font-medium">
                      {formatCurrency(method.amount)}
                    </span>
                  </div>
                  {method.reference && (
                    <div className="text-xs text-muted-foreground">
                      Ref: {method.reference}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {payment.customer ? (
                  <Link
                    href={`/clientes/${payment.customer.id}`}
                    className="text-lg font-semibold text-primary hover:underline"
                  >
                    {payment.customer.name}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold">Sin cliente</span>
                )}
                {payment.customer?.tax_id && (
                  <p className="text-sm text-muted-foreground">
                    CUIT {payment.customer.tax_id}
                  </p>
                )}
              </div>

              {payment.customer?.street_address && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Domicilio
                    </p>
                    <p className="font-medium">
                      {payment.customer.street_address}
                      {payment.customer.city && `, ${payment.customer.city}`}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                Notas
              </CardTitle>
              {!isCancelled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setTempNote(payment.notes || "");
                    setNoteDialogOpen(true);
                  }}
                >
                  Editar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{payment.notes || "-"}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular cobranza</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés anular esta cobranza? Esta acción
              revertirá los montos pagados en las ventas asociadas.
            </DialogDescription>
          </DialogHeader>
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
              Anular cobranza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nota</DialogTitle>
          </DialogHeader>
          <Textarea
            value={tempNote}
            onChange={(e) => setTempNote(e.target.value)}
            placeholder="Agregar una nota..."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              disabled={isSavingNote}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveNote} disabled={isSavingNote}>
              {isSavingNote && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
