"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  getShiftById,
  getShiftSummary,
  type Shift,
  type ShiftSummary,
} from "@/lib/services/shifts";
import { createClient } from "@/lib/supabase/client";

// Types
interface ShiftActivity {
  id: string;
  type: "opening" | "closing" | "sale" | "refund" | "cash_in" | "cash_out";
  description: string;
  time: string;
  seller: string;
  notes: string | null;
  amount: number | null;
  saleNumber?: string;
  saleId?: string;
}

export default function ShiftDetailPage() {
  const params = useParams();
  const shiftId = params.id as string;

  // Data
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [activities, setActivities] = useState<ShiftActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load shift data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shiftData, summaryData] = await Promise.all([
        getShiftById(shiftId),
        getShiftSummary(shiftId),
      ]);

      setShift(shiftData);
      setSummary(summaryData);

      // Load activities (sales + movements)
      if (shiftData) {
        const activitiesList = await loadActivities(shiftId, shiftData);
        setActivities(activitiesList);
      }
    } catch (error) {
      console.error("Error loading shift:", error);
      toast.error("Error al cargar turno");
    } finally {
      setIsLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load activities from sales and movements
  async function loadActivities(
    shiftId: string,
    shift: Shift,
  ): Promise<ShiftActivity[]> {
    const supabase = createClient();
    const activities: ShiftActivity[] = [];

    // Opening activity
    activities.push({
      id: `opening-${shift.id}`,
      type: "opening",
      description: `Apertura de turno - Monto en caja: ${formatCurrency(Number(shift.opening_amount))}`,
      time: shift.opened_at,
      seller: "", // TODO: get user name
      notes: null,
      amount: Number(shift.opening_amount),
    });

    // Get sales for this shift
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(
        `
        id,
        sale_number,
        total,
        voucher_type,
        created_at,
        seller_id,
        customer_payment_allocations(
          customer_payment:customer_payments(
            customer_payment_methods(method_name, amount)
          )
        )
      `,
      )
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: true });

    if (!salesError && sales) {
      for (const sale of sales) {
        const paymentMethods =
          (sale.customer_payment_allocations || [])
            .flatMap(
              (a: any) =>
                a.customer_payment?.customer_payment_methods || [],
            )
            .map((m: { method_name: string }) => m.method_name)
            .filter(Boolean)
            .join(", ") || "";
        const isRefund = sale.voucher_type?.startsWith("NOTA_CREDITO");

        activities.push({
          id: sale.id,
          type: isRefund ? "refund" : "sale",
          description: `Cobro ${paymentMethods}`,
          time: sale.created_at,
          seller: "", // TODO: get user name
          notes: null,
          amount: Number(sale.total),
          saleNumber: sale.sale_number,
          saleId: sale.id,
        });
      }
    }

    // Get manual movements
    const { data: movements, error: movementsError } = await supabase
      .from("cash_register_movements")
      .select("*")
      .eq("shift_id", shiftId)
      .order("created_at", { ascending: true });

    if (!movementsError && movements) {
      for (const movement of movements) {
        activities.push({
          id: movement.id,
          type: movement.type as "cash_in" | "cash_out",
          description:
            movement.type === "cash_in"
              ? "Ingreso efectivo"
              : "Retiro efectivo",
          time: movement.created_at,
          seller: "", // TODO: get user name
          notes: movement.notes,
          amount: Number(movement.amount),
        });
      }
    }

    // Closing activity (if closed)
    if (shift.status === "closed" && shift.closed_at) {
      activities.push({
        id: `closing-${shift.id}`,
        type: "closing",
        description: "Cierre de turno",
        time: shift.closed_at,
        seller: "", // TODO: get user name
        notes: shift.discrepancy_notes,
        amount: null,
      });
    }

    // Sort by time descending (most recent first)
    return activities.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
  }

  // Formatting
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return format(date, "HH:mm", { locale: es });
    } else if (diffDays === 1) {
      return `ayer a las ${format(date, "HH:mm", { locale: es })}`;
    } else if (diffDays < 7) {
      return format(date, "EEEE 'a las' HH:mm", { locale: es });
    } else {
      return format(date, "d/M/yyyy HH:mm", { locale: es });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <p className="text-muted-foreground">Turno no encontrado</p>
        <Link href="/turnos" className="mt-4 text-primary hover:underline">
          Volver a turnos
        </Link>
      </div>
    );
  }

  const previousAmount = Number(shift.opening_amount) || 0;
  const countedStart = Number(shift.opening_amount) || 0;
  const countedEnd = Number(shift.counted_amount) || 0;
  const discrepancy = Number(shift.discrepancy) || 0;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="gap-4">
          <Link
            href="/turnos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Turnos
            <ChevronRight className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-4 print-header">
            <h2 className="text-2xl font-bold tracking-tight">
              Detalles del Turno
            </h2>
            <Badge
              variant="secondary"
              className={cn(
                shift.status === "closed" &&
                  "border-transparent bg-gray-100 text-gray-800 hover:bg-gray-100",
              )}
            >
              {shift.status === "open" ? "Abierto" : "Cerrado"}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="no-print">
          Imprimir
          <kbd className="pointer-events-none ml-2 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:inline-flex">
            <span className="text-xs">⌘</span>P
          </kbd>
        </Button>
      </div>

      {/* Content */}
      <div className="grid gap-6 printable">
        {/* Info Card */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Caja</p>
              <p className="font-semibold">{shift.cash_register?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inicio
              </p>
              <p className="font-semibold">{formatDateTime(shift.opened_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fin</p>
              <p className="font-semibold">
                {shift.closed_at ? (
                  formatDateTime(shift.closed_at)
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Discrepancy Card */}
          <Card className="gap-2">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">
                Resumen de Discrepancia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Monto previo en caja
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(previousAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Contado al inicio
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(countedStart)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Contado al final
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(countedEnd)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">Discrepancia</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    discrepancy < 0 && "text-red-600 dark:text-red-400",
                  )}
                >
                  {formatCurrency(discrepancy)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card className="gap-2">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">
                Actividad de Efectivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Cobranzas brutas
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(summary?.grossCollections || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Devoluciones
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(summary?.refunds || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Ajustes de efectivo
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(
                    (summary?.cashIn || 0) - (summary?.cashOut || 0),
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">Efectivo esperado</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(summary?.currentCashAmount || 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Table */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actividad</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No hay actividades
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="max-w-[300px] whitespace-normal">
                      {activity.description}
                      {activity.saleNumber && (
                        <Link
                          href={`/ventas/${activity.saleId}`}
                          className="block text-sm font-medium text-blue-500 underline-offset-4 transition-all duration-200 hover:underline"
                        >
                          {activity.saleNumber}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(activity.time)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {activity.seller || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal">
                      {activity.notes || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {activity.amount !== null ? (
                        <span className="text-sm font-medium">
                          {formatCurrency(activity.amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
