"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  createCreditNote,
  getSaleForCreditNote,
  type CreditNoteItem,
  type OriginalSaleForCreditNote,
} from "@/lib/services/credit-notes";
import { getMainLocation } from "@/lib/services/locations";
import { getPaymentMethods } from "@/lib/services/payment-methods";
import { cn } from "@/lib/utils";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(amount);
}

export function NuevaNcContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const saleId = searchParams.get("saleId");

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalSale, setOriginalSale] =
    useState<OriginalSaleForCreditNote | null>(null);
  const [items, setItems] = useState<CreditNoteItem[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [location, setLocation] = useState<{ id: string; name: string } | null>(
    null,
  );

  // Load initial data
  useEffect(() => {
    if (!saleId) {
      toast.error("No se especificó una venta");
      router.push("/ventas");
      return;
    }

    async function loadData() {
      setIsLoading(true);
      try {
        // Load original sale
        const sale = await getSaleForCreditNote(saleId!);
        setOriginalSale(sale);
        setItems(sale.items);

        // Load payment methods
        const methods = await getPaymentMethods({ isActive: true });
        setPaymentMethods(methods.map((m) => ({ id: m.id, name: m.name })));
        if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0].id);
        }

        // Load location
        const loc = await getMainLocation();
        setLocation(loc);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error al cargar la venta");
        router.push("/ventas");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [saleId, router]);

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = items.reduce(
    (sum, item) => sum + (item.price * item.quantity * item.taxRate) / 100,
    0,
  );
  const total = subtotal + tax;

  // Total paid in original sale
  const totalPaid = originalSale?.amount_paid || 0;

  // Handlers
  const handleQuantityChange = (itemId: string, change: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(
            0,
            Math.min(item.maxQuantity, item.quantity + change),
          );
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    );
  };

  const handleQuantityInput = (itemId: string, value: number) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, Math.min(item.maxQuantity, value));
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    );
  };

  const selectAll = () => {
    setItems(items.map((item) => ({ ...item, quantity: item.maxQuantity })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalSale || !location) {
      toast.error("Datos incompletos");
      return;
    }

    const itemsToCredit = items.filter((item) => item.quantity > 0);
    if (itemsToCredit.length === 0) {
      toast.error("Seleccioná al menos un producto para devolver");
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("Seleccioná un método de reembolso");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMethod = paymentMethods.find(
        (m) => m.id === selectedPaymentMethod,
      );

      const creditNote = await createCreditNote({
        originalSaleId: originalSale.id,
        customerId: originalSale.customerId,
        items: itemsToCredit.map((item) => ({
          productId: item.productId,
          description: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
          taxRate: item.taxRate,
        })),
        refund: {
          paymentMethodId: selectedPaymentMethod,
          methodName: selectedMethod?.name || "",
          amount: total,
        },
        notes: notes || null,
        date,
        locationId: location.id,
      });

      toast.success(`Nota de crédito ${creditNote.sale_number} creada`);
      router.push(`/ventas/${creditNote.id}`);
    } catch (error) {
      console.error("Error creating credit note:", error);
      toast.error("Error al crear la nota de crédito");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!originalSale) {
    return null;
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href={`/ventas/${originalSale.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Venta
            <ChevronRight className="h-3 w-3" />
          </Link>
          <h1 className="text-3xl font-bold">Nueva nota de crédito</h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Info card */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Vas a crear una{" "}
                  <span className="font-semibold text-foreground">
                    Nota de Crédito X
                  </span>{" "}
                  para el comprobante{" "}
                  <Link
                    href={`/ventas/${originalSale.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {originalSale.saleNumber}
                  </Link>{" "}
                  de{" "}
                  <span className="font-medium">{originalSale.customerName}</span>
                </p>
              </CardContent>
            </Card>

            {/* Products card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Productos</CardTitle>
                    <CardDescription>
                      Seleccioná los productos que se devuelven. El stock
                      disponible se incrementará.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                  >
                    Seleccionar todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border-b px-4 py-3 last:border-b-0"
                  >
                    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="text-xs font-medium sm:text-sm">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {item.sku} · {formatPrice(item.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {item.maxQuantity} disponible
                          </span>
                          <div className="flex items-stretch overflow-hidden rounded-lg border">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              onClick={() => handleQuantityChange(item.id, -1)}
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max={item.maxQuantity}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityInput(
                                  item.id,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="h-8 w-14 rounded-none border-0 border-x text-center text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              disabled={item.quantity >= item.maxQuantity}
                              onClick={() => handleQuantityChange(item.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            Precio unitario
                          </span>
                          <Input
                            type="text"
                            value={formatPrice(item.price)}
                            disabled
                            className="h-8 w-28 text-right text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Date and Notes card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Fecha de emisión</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date
                            ? format(date, "d 'de' MMMM 'de' yyyy", {
                                locale: es,
                              })
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(newDate) => newDate && setDate(newDate)}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="returnsNotes">Notas (opcional)</Label>
                    <Input
                      id="returnsNotes"
                      placeholder="Agregá notas sobre esta nota de crédito…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Summary card */}
            <Card className="sticky top-6 z-10">
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA</span>
                  <span className="tabular-nums">{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(total)}</span>
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || total === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Confirmar nota de crédito"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Refund amount card */}
            <Card>
              <CardContent className="pt-6">
                <div>
                  <Label className="mb-3 block">Monto a reembolsar</Label>
                  <div className="space-y-3">
                    <Select
                      value={selectedPaymentMethod}
                      onValueChange={setSelectedPaymentMethod}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Pagado: {formatPrice(totalPaid)}
                      </span>
                      <span className="font-medium">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
