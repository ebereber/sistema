"use client";

import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  ExternalLink,
  File,
  Mail,
  MapPin,
  Package,
  Printer,
  StickyNote,
  TrendingUp,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddNoteDialog } from "@/components/ventas/add-note-dialog";
import { updateSaleNotesAction } from "@/lib/actions/sales";
import type { SaleWithDetails } from "@/lib/services/sales";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) return "hoy";
  if (isYesterday(date)) return "ayer";
  return format(date, "d 'de' MMMM", { locale: es });
}

function formatFullDate(dateString: string) {
  const date = new Date(dateString);
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

interface VentaDetailClientProps {
  sale: SaleWithDetails;
}

export function VentaDetailClient({
  sale: initialSale,
}: VentaDetailClientProps) {
  const router = useRouter();
  const [sale, setSale] = useState(initialSale);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [tempNote, setTempNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveNote = async () => {
    try {
      setIsSavingNote(true);
      await updateSaleNotesAction(sale.id, tempNote || null);
      setSale((prev) => ({ ...prev, notes: tempNote || null }));
      toast.success("Nota actualizada");
      setNoteDialogOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error saving note:", err);
      toast.error("Error al guardar la nota");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Calculate profitability
  const cmv = sale.items.reduce((sum, item) => {
    const cost = item.product?.cost || 0;
    return sum + cost * item.quantity;
  }, 0);

  const paymentFee = sale.customer_payment_receipts.reduce((sum, rcb) => {
    return (
      sum +
      rcb.methods.reduce((mSum, method) => {
        const percentageFee = (method.amount * method.fee_percentage) / 100;
        return mSum + percentageFee + method.fee_fixed;
      }, 0)
    );
  }, 0);

  const grossProfit = sale.total - cmv - paymentFee;
  /*   const netTaxed = sale.subtotal - sale.discount */
  const grossSubtotal = sale.subtotal + sale.tax + sale.discount;
  const netTaxed = sale.subtotal;

  const googleMapsUrl = sale.customer?.street_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${sale.customer.street_address}, ${sale.customer.city || ""}`,
      )}`
    : null;

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/ventas"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Ventas
            <ChevronRight className="size-3" />
          </Link>
          <div>
            <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
              <h1 className="text-3xl font-bold">
                {formatCurrency(sale.total)}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Vendido a {sale.customer?.name || "Consumidor Final"}{" "}
              <span className="font-semibold text-primary">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="font-semibold text-primary">
                      {formatRelativeDate(sale.sale_date)}
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatFullDate(sale.sale_date)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>{" "}
              por {sale.seller?.name || sale.location?.name || "Sistema"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="default">
            <Download className="size-4" />
            Descargar remito
          </Button>
          <Button variant="outline" size="default" asChild>
            <Link href={`/ventas/nueva-nc?saleId=${sale.id}`}>
              <Undo2 className="size-4" />
              Crear nota de credito
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-3">
          {/* Invoice Card */}
          <Card className="p-4">
            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
              <div className="flex w-full items-center justify-between gap-2 md:w-auto">
                <div className="mx-auto flex items-center gap-2">
                  <File className="size-4 text-muted-foreground" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        {sale.sale_number}
                      </TooltipTrigger>
                      <TooltipContent>Comprobante</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden hover:text-primary/80 md:flex"
                      >
                        <Download className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Descargar PDF</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden hover:text-primary/80 md:flex"
                        disabled
                      >
                        <Mail className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Enviar por email</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="outline"
                  className="w-full md:w-auto"
                  size="default"
                >
                  <Printer className="size-4" />
                  Imprimir
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:hidden"
                  disabled
                >
                  <Mail className="size-4" />
                  Reenviar por email
                </Button>
              </div>
            </div>
          </Card>

          {/* Products Card */}
          <Card className="group py-4">
            <CardHeader className="group">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  Productos
                </div>
                <Button
                  variant="ghost"
                  size="default"
                  className="flex items-center gap-2 opacity-0 group-hover:opacity-100"
                >
                  <MapPin className="size-4" />
                  Cambiar ubicacion
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  {sale.items.map((item) => (
                    <div key={item.id} className="border-b-0 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {item.product_id ? (
                            <Link
                              href={`/productos/${item.product_id}`}
                              className="mb-1 text-base font-medium underline-offset-4 decoration-muted-foreground transition-colors hover:underline"
                            >
                              {item.description}
                            </Link>
                          ) : (
                            <span className="mb-1 text-base font-medium">
                              {item.description}
                            </span>
                          )}
                          {item.sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold">
                            {formatCurrency(item.total)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <p>{formatCurrency(item.unit_price)}</p>
                            <span>x</span>
                            <span className="inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-lg border px-2 py-0.5 font-mono text-sm font-medium">
                              {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Subtotal productos
                    </span>
                    <span className="text-sm">
                      {formatCurrency(grossSubtotal)}
                    </span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Descuento
                      </span>
                      <span className="text-sm text-destructive">
                        -{formatCurrency(sale.discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Neto gravado
                    </span>
                    <span className="text-sm">{formatCurrency(netTaxed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">IVA</span>
                    <span className="text-sm">{formatCurrency(sale.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">Comprobante</span>
                    <span className="text-base font-bold">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  Pagos
                </div>
                {sale.status === "PENDING" &&
                  !sale.voucher_type.startsWith("NOTA_CREDITO") && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cobranzas/nueva?saleId=${sale.id}`}>
                        Nuevo cobro
                      </Link>
                    </Button>
                  )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sale.voucher_type.startsWith("NOTA_CREDITO") ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Credito disponible</span>
                    <span>
                      {formatCurrency(
                        sale.total -
                          (sale.applied_to_sales?.reduce(
                            (sum, app) => sum + Number(app.amount),
                            0,
                          ) || 0),
                      )}
                    </span>
                  </div>

                  {sale.applied_to_sales &&
                    sale.applied_to_sales.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Aplicado</span>
                            <span>
                              {formatCurrency(
                                sale.applied_to_sales.reduce(
                                  (sum, app) => sum + Number(app.amount),
                                  0,
                                ),
                              )}
                            </span>
                          </div>
                          {sale.applied_to_sales.map((app) => (
                            <Link
                              key={app.id}
                              href={`/ventas/${app.applied_to_sale.id}`}
                              className="-mx-2 flex items-center justify-between rounded px-2 py-2 hover:bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {app.applied_to_sale.sale_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Aplicado a factura
                                </p>
                              </div>
                              <span className="text-sm font-medium">
                                {formatCurrency(app.amount)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Pagado</span>
                    <span>
                      {formatCurrency(
                        sale.customer_payment_receipts?.reduce(
                          (sum, rcb) => sum + rcb.amount,
                          0,
                        ) || 0,
                      )}
                    </span>
                  </div>

                  {sale.applied_credit_notes &&
                    sale.applied_credit_notes.length > 0 && (
                      <>
                        <Separator />
                        {sale.applied_credit_notes.map((app) => (
                          <Link
                            key={app.id}
                            href={`/ventas/${app.credit_note.id}`}
                            className="-mx-2 flex items-center justify-between rounded px-2 py-2 hover:bg-muted/50"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {app.credit_note.sale_number}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Nota de credito aplicada
                              </p>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrency(app.amount)}
                            </span>
                          </Link>
                        ))}
                      </>
                    )}

                  {((sale.customer_payment_receipts &&
                    sale.customer_payment_receipts.length > 0) ||
                    sale.status === "PENDING") && (
                    <>
                      {sale.status === "PENDING" &&
                        sale.total - (sale.amount_paid || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm text-destructive">
                            <span>Saldo pendiente</span>
                            <span className="font-medium">
                              {formatCurrency(
                                sale.total - (sale.amount_paid || 0),
                              )}
                            </span>
                          </div>
                        )}

                      {sale.due_date && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Vencimiento</span>
                          <span>{formatRelativeDate(sale.due_date)}</span>
                        </div>
                      )}

                      {sale.customer_payment_receipts &&
                        sale.customer_payment_receipts.length > 0 && (
                          <>
                            <Separator />
                            {sale.customer_payment_receipts.map((rcb) => (
                              <Link
                                key={rcb.id}
                                href={`/cobranzas/${rcb.payment_id}`}
                                className="-mx-2 rounded border-b px-2 py-3 last:border-b-0 hover:bg-muted/50"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {rcb.payment_number}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            {formatRelativeDate(
                                              rcb.payment_date,
                                            )}
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {formatFullDate(rcb.payment_date)}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </span>
                                    {rcb.payment_status === "cancelled" && (
                                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                                        Anulado
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {formatCurrency(rcb.amount)}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {rcb.methods
                                    .map((m) => m.method_name)
                                    .join(", ")}
                                </div>
                              </Link>
                            ))}
                          </>
                        )}
                    </>
                  )}

                  {sale.credit_notes && sale.credit_notes.length > 0 && (
                    <>
                      <Separator />
                      {sale.credit_notes.map((nc) => (
                        <Link
                          key={nc.id}
                          href={`/ventas/${nc.id}`}
                          className="-mx-2 flex items-center justify-between rounded px-2 py-2 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Nota de Credito
                            </span>
                            <ExternalLink className="size-3" />
                            <span className="text-xs text-muted-foreground">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {formatRelativeDate(nc.created_at)}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {formatFullDate(nc.created_at)}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </div>
                          <span className="text-sm font-medium text-destructive">
                            -{formatCurrency(nc.total)}
                          </span>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="col-span-2 space-y-6">
          {/* Customer Card */}
          <Card className="py-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                {sale.customer ? (
                  <Link
                    href={`/clientes/${sale.customer.id}`}
                    className="h-auto whitespace-normal p-0 text-lg font-semibold text-primary hover:underline"
                  >
                    {sale.customer.name}
                  </Link>
                ) : (
                  <span className="text-lg font-semibold">
                    Consumidor Final
                  </span>
                )}
              </div>

              {sale.customer?.street_address && (
                <>
                  <Separator />
                  <div className="break-words font-medium">
                    <p className="mb-2 text-sm text-muted-foreground">
                      Domicilio
                    </p>
                    <p className="break-words">
                      {sale.customer.street_address}
                      {sale.customer.city && `, ${sale.customer.city}`}
                    </p>
                    {googleMapsUrl && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex transform items-center gap-2 text-sm text-blue-500 duration-200 hover:text-blue-600 hover:underline"
                      >
                        <MapPin className="size-4" />
                        Buscar en Google Maps
                      </a>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-4 text-muted-foreground" />
                Notas
              </CardTitle>
              <Button
                variant="link"
                size="default"
                className="h-6 py-0 text-muted-foreground"
                onClick={() => {
                  setTempNote(sale.notes || "");
                  setNoteDialogOpen(true);
                }}
              >
                Editar
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{sale.notes || "-"}</p>
            </CardContent>
          </Card>

          {/* Profitability Card */}
          {!sale.voucher_type.startsWith("NOTA_CREDITO") && (
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-muted-foreground" />
                  Rentabilidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody className="text-muted-foreground">
                    <TableRow>
                      <TableCell className="font-medium">
                        Total Facturado
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.total)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                Comision por cobro
                                <CircleHelp className="size-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Comision aplicada por el metodo de pago
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        -{formatCurrency(paymentFee)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1">
                                CMV
                                <CircleHelp className="size-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Costo de Mercaderia Vendida
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        -{formatCurrency(cmv)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 text-primary">
                      <TableCell className="text-lg font-semibold">
                        Ganancia Bruta
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        {formatCurrency(grossProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
