"use client";

import { DeleteQuoteDialog } from "@/components/presupuestos/delete-quote-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteQuote,
  getQuoteById,
  parseQuoteItems,
  type QuoteItemData,
} from "@/lib/services/quotes";
import type { Database } from "@/lib/supabase/database.types";
import { formatPrice } from "@/lib/validations/sale";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Loader2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatItemDiscount(item: QuoteItemData): string {
  if (!item.discount) return "—";
  if (item.discount.type === "percentage") return `${item.discount.value}%`;
  return formatPrice(item.discount.value);
}

function calculateItemDiscountAmount(item: QuoteItemData): number {
  if (!item.discount) return 0;
  const subtotal = item.price * item.quantity;
  if (item.discount.type === "percentage") {
    return subtotal * (item.discount.value / 100);
  }
  return Math.min(item.discount.value * item.quantity, subtotal);
}

function calculateItemTotal(item: QuoteItemData): number {
  const subtotal = item.price * item.quantity;
  return subtotal - calculateItemDiscountAmount(item);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getQuoteById(id);
        setQuote(data);
      } catch {
        toast.error("Presupuesto no encontrado");
        router.push("/presupuestos");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, router]);

  const handleLoadCart = () => {
    if (!quote) return;
    router.push(`/ventas/nueva?quoteId=${quote.id}`);
  };

  const handleDownloadPDF = () => {
    toast.info("Próximamente", {
      description: "La descarga de PDF estará disponible pronto.",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!quote) return;
    setIsDeleting(true);
    try {
      await deleteQuote(quote.id);
      toast.success("Presupuesto eliminado");
      router.push("/presupuestos");
    } catch {
      toast.error("Error al eliminar presupuesto");
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) return null;

  const { cartItems, globalDiscount } = parseQuoteItems(quote.items);
  const hasDiscounts = cartItems.some((item) => item.discount);

  return (
    <div className="flex h-full flex-1 flex-col space-y-6 p-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/presupuestos">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Presupuestos
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
          <p className="text-sm text-muted-foreground">
            {format(
              new Date(quote.created_at),
              "d 'de' MMMM 'de' yyyy, HH:mm",
              {
                locale: es,
              },
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cargar carrito
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-medium">
              {quote.customer_name || "Consumidor Final"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Productos</p>
            <p className="font-medium">
              {cartItems.length}{" "}
              {cartItems.length === 1 ? "artículo" : "artículos"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Notas</p>
            <p className="font-medium">{quote.notes || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              {hasDiscounts && (
                <TableHead className="text-right">Desc.</TableHead>
              )}
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cartItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">
                        {item.sku}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatPrice(item.price)}
                </TableCell>
                {hasDiscounts && (
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatItemDiscount(item)}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium">
                  {formatPrice(calculateItemTotal(item))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(Number(quote.subtotal))}</span>
          </div>

          {Number(quote.discount) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Descuentos</span>
              <span className="text-destructive">
                -{formatPrice(Number(quote.discount))}
              </span>
            </div>
          )}

          {globalDiscount && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="ml-2">
                Desc. global:{" "}
                {globalDiscount.type === "percentage"
                  ? `${globalDiscount.value}%`
                  : formatPrice(globalDiscount.value)}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg">{formatPrice(Number(quote.total))}</span>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <DeleteQuoteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        quoteNumber={quote.quote_number}
      />
    </div>
  );
}
