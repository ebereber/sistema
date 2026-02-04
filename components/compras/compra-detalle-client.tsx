"use client"

import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  ChevronRight,
  CreditCard,
  ExternalLink,
  File,
  Package,
  Plus,
  SquarePen,
  StickyNote,
  User,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { AddNoteDialog } from "@/components/ventas/add-note-dialog"
import { updatePurchaseNoteAction } from "@/lib/actions/purchases"
import type { Purchase, PurchasePaymentAllocation } from "@/lib/services/purchases"

interface CompraDetalleClientProps {
  purchase: Purchase
  payments: PurchasePaymentAllocation[]
}

export function CompraDetalleClient({
  purchase,
  payments,
}: CompraDetalleClientProps) {
  const router = useRouter()

  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [tempNote, setTempNote] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)

  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0,00"
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const handleOpenNoteDialog = () => {
    setTempNote(purchase.notes || "")
    setNoteDialogOpen(true)
  }

  const handleSaveNote = async () => {
    setIsSavingNote(true)
    try {
      await updatePurchaseNoteAction(purchase.id, tempNote || null)
      toast.success(tempNote ? "Nota guardada" : "Nota eliminada")
      setNoteDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving note:", error)
      toast.error("Error al guardar la nota")
    } finally {
      setIsSavingNote(false)
    }
  }

  const formatFecha = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return format(new Date(dateStr), "d/M/yyyy", { locale: es })
  }

  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return "hoy"
    if (diffDays === 1) return "ayer"
    if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: es })
    }
    return format(date, "d 'de' MMMM", { locale: es })
  }

  const totalUnits =
    purchase.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/compras"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Compras
            <ChevronRight className="h-3 w-3" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {formatCurrency(Number(purchase.total))}
              </h1>
              {purchase.products_received && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  Recibido
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground">
              Comprado a{" "}
              <Link
                href={`/proveedores/${purchase.supplier?.id}`}
                className="font-semibold text-primary hover:underline"
              >
                {purchase.supplier?.name}
              </Link>{" "}
              <span className="font-semibold text-primary">
                {formatRelativeDate(purchase.created_at)}
              </span>
            </p>
          </div>
        </div>
        <div>
          <Link href={`/compras/${purchase.id}/editar`}>
            <Button>
              <SquarePen className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de 3 columnas */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Columna principal (izquierda) - 3 columnas */}
        <div className="space-y-6 lg:col-span-3">
          {/* Card de número de factura */}
          <Card className="bg-muted p-4">
            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
              <div className="flex w-full items-center justify-between gap-2 md:w-auto">
                <div className="mx-auto flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{purchase.purchase_number}</span>
                </div>
              </div>
              {purchase.attachment_url && (
                <Link
                  href={purchase.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver comprobante
                </Link>
              )}
            </div>
          </Card>

          {/* Card de fechas */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 px-4 py-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Nº Factura Proveedor</p>
                <p className="font-medium font-mono">
                  {purchase.voucher_number}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha factura</p>
                <p className="font-medium">
                  {formatFecha(purchase.invoice_date)}
                </p>
              </div>
              {purchase.due_date && (
                <div>
                  <p className="text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">
                    {formatFecha(purchase.due_date)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Productos
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalUnits} {totalUnits === 1 ? "unidad" : "unidades"}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                {purchase.items?.map((item, index) => (
                  <div
                    key={item.id}
                    className={`py-4 ${
                      index !== (purchase.items?.length || 0) - 1
                        ? "border-b"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {item.product_id ? (
                            <Link
                              href={`/productos/${item.product_id}`}
                              className="text-base font-medium underline decoration-muted-foreground underline-offset-4 transition-colors hover:underline"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="text-base font-medium">
                              {item.name}
                            </span>
                          )}
                          {item.type === "custom" && (
                            <Badge variant="outline">Personalizado</Badge>
                          )}
                        </div>
                        {item.sku && (
                          <div className="text-sm text-muted-foreground">
                            SKU: {item.sku}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold">
                          {formatCurrency(Number(item.subtotal))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatCurrency(Number(item.unit_cost))}</span>
                          <span>×</span>
                          <Badge className="font-mono text-sm">
                            {item.quantity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totales */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="text-sm">
                      {formatCurrency(Number(purchase.subtotal))}
                    </span>
                  </div>
                  {Number(purchase.discount) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Descuento
                      </span>
                      <span className="text-sm text-green-600">
                        -{formatCurrency(Number(purchase.discount))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Impuestos
                    </span>
                    <span className="text-sm">
                      {formatCurrency(Number(purchase.tax))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-base font-bold">
                      {formatCurrency(Number(purchase.total))}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Pagos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Pagos
                </div>
                {purchase.payment_status !== "paid" && (
                  <Link href={`/pagos/nuevo?purchaseId=${purchase.id}`}>
                    <Button size="sm">
                      <Plus className="mr-1 h-4 w-4" />
                      Nuevo pago
                    </Button>
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Neto gravado
                  </span>
                  <span className="text-sm">
                    {formatCurrency(Number(purchase.subtotal))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">IVA</span>
                  <span className="text-sm">
                    {formatCurrency(Number(purchase.tax))}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-sm font-medium">Total facturado</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(Number(purchase.total))}
                  </span>
                </div>

                {Number(purchase.amount_paid || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">
                      Total pagado
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(Number(purchase.amount_paid))}
                    </span>
                  </div>
                )}

                {purchase.payment_status !== "paid" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-destructive">
                      Saldo pendiente
                    </span>
                    <span className="text-sm font-medium text-destructive">
                      {formatCurrency(
                        Number(purchase.total) -
                          Number(purchase.amount_paid || 0)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Lista de pagos */}
              {payments.length > 0 ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {payments
                    .filter((p) => p.payment_status !== "cancelled")
                    .map((allocation) => {
                      const methodsDisplay =
                        allocation.methods.length === 1
                          ? allocation.methods[0]
                          : allocation.methods.length > 1
                            ? `${allocation.methods[0]} + ${allocation.methods.length - 1} más`
                            : "-"

                      return (
                        <div
                          key={allocation.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {methodsDisplay}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeDate(allocation.payment_date)} ·{" "}
                              <Link
                                href={`/pagos/${allocation.payment_id}`}
                                className="text-primary hover:underline"
                              >
                                #{allocation.payment_number}
                              </Link>
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(allocation.amount)}
                          </span>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="mt-4 border-t pt-4">
                  <p className="text-muted-foreground">
                    No hay pagos registrados para esta compra
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral (derecha) - 2 columnas */}
        <div className="col-span-2 space-y-6">
          {/* Card de Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={`/proveedores/${purchase.supplier?.id}`}
                  className="text-lg font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {purchase.supplier?.name}
                </Link>
                {purchase.supplier?.tax_id && (
                  <p className="text-sm text-muted-foreground">
                    CUIT: {purchase.supplier.tax_id}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card de Notas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                Notas
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                className="h-6 py-0 text-muted-foreground"
                onClick={handleOpenNoteDialog}
              >
                {purchase.notes ? "Editar" : "Agregar"}
              </Button>
            </CardHeader>
            <CardContent>
              <p className={purchase.notes ? "" : "text-muted-foreground"}>
                {purchase.notes || "-"}
              </p>
            </CardContent>
          </Card>

          {/* Card de Ubicación (si hay) */}
          {purchase.location && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{purchase.location.name}</p>
                {purchase.products_received && (
                  <p className="text-sm text-green-600">
                    Productos recibidos en esta ubicación
                  </p>
                )}
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
  )
}
