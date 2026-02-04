"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { Shift, ShiftSummary } from "@/lib/services/shifts";
import type { ShiftActivity } from "@/lib/services/shifts-cached";

interface TurnoDetalleClientProps {
  shift: Shift;
  summary: ShiftSummary;
  activities: ShiftActivity[];
}

export function TurnoDetalleClient({
  shift,
  summary,
  activities,
}: TurnoDetalleClientProps) {
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

  const previousAmount = Number(shift.opening_amount) || 0;
  const countedStart = Number(shift.opening_amount) || 0;
  const countedEnd = Number((shift as any).counted_amount) || 0;
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
                  {formatCurrency(summary.grossCollections)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Devoluciones
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(summary.refunds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Ajustes de efectivo
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(summary.cashIn - summary.cashOut)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-sm font-medium">Efectivo esperado</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(summary.currentCashAmount)}
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
