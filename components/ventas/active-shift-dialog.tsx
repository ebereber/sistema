"use client";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getShiftSummaryAction } from "@/lib/actions/shifts";
import type { Shift, ShiftSummary } from "@/lib/services/shifts";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CloseShiftDialog } from "./close-shift-dialog";

// Types
interface ShiftActivity {
  id: string;
  type: "opening" | "sale" | "refund" | "cash_in" | "cash_out";
  description: string;
  time: string;
  user: string;
  notes: string | null;
  amount: number | null;
  saleNumber?: string;
  saleId?: string;
}

interface ActiveShiftDialogProps {
  shift: Shift;
  safeBoxes: Array<{ id: string; name: string }>;
  onDepositToSafeBox: (
    safeBoxId: string,
    amount: number,
    notes?: string,
  ) => Promise<void>;
  onCloseShift: (
    countedAmount: number,
    leftInCash: number,
    discrepancyNotes?: string,
    safeBoxDeposit?: { safeBoxId: string; amount: number },
  ) => Promise<void>;
  onChangeCashRegister?: () => void;
  onRefresh?: () => void;
  trigger?: React.ReactNode;
}

export function ActiveShiftDialog({
  shift,
  safeBoxes,
  onDepositToSafeBox,
  onCloseShift,
  onChangeCashRegister,
  onRefresh,
  trigger,
}: ActiveShiftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activities, setActivities] = useState<ShiftActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Safe box deposit dialog
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositSafeBoxId, setDepositSafeBoxId] = useState("");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositNotes, setDepositNotes] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  // Load activities when detail is expanded
  const loadActivities = useCallback(async () => {
    if (!shift?.id) return;

    setIsLoadingActivities(true);
    try {
      const supabase = createClient();
      const activitiesList: ShiftActivity[] = [];

      // Opening activity
      activitiesList.push({
        id: `opening-${shift.id}`,
        type: "opening",
        description: `Apertura de turno - Monto en caja: ${formatCurrency(Number(shift.opening_amount))}`,
        time: shift.opened_at,
        user: "",
        notes: null,
        amount: Number(shift.opening_amount),
      });

      // Get sales
      const { data: sales } = await supabase
        .from("sales")
        .select(
          `
          id,
          sale_number,
          total,
          voucher_type,
          created_at,
          customer_payment_allocations(
            customer_payment:customer_payments(
              customer_payment_methods(method_name, amount)
            )
          )
        `,
        )
        .eq("shift_id", shift.id)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false });

      if (sales) {
        for (const sale of sales) {
          const methods = (sale.customer_payment_allocations || []).flatMap(
            (a: any) =>
              a.customer_payment?.customer_payment_methods || [],
          );
          const paymentMethods =
            methods
              .map((m: { method_name: string }) => {
                const name = m.method_name?.toLowerCase();
                if (name === "efectivo") return "Efectivo";
                if (name === "tarjeta") return "Tarjeta";
                if (name === "transferencia") return "Transferencia";
                if (name === "qr") return "QR";
                return m.method_name;
              })
              .filter(Boolean)
              .join(", ") || "";

          const isRefund = sale.voucher_type?.startsWith("NOTA_CREDITO");

          activitiesList.push({
            id: sale.id,
            type: isRefund ? "refund" : "sale",
            description: `Cobro ${paymentMethods}: ${formatCurrency(Number(sale.total))} - ${sale.sale_number}`,
            time: sale.created_at,
            user: "",
            notes: null,
            amount: Number(sale.total),
            saleNumber: sale.sale_number,
            saleId: sale.id,
          });
        }
      }

      // Get manual movements
      const { data: movements } = await supabase
        .from("cash_register_movements")
        .select("*")
        .eq("shift_id", shift.id)
        .order("created_at", { ascending: false });

      if (movements) {
        for (const movement of movements) {
          const isSafeBoxDeposit =
            movement.type === "cash_out" &&
            movement.notes?.startsWith("Deposito en caja fuerte:");

          activitiesList.push({
            id: movement.id,
            type: movement.type as "cash_in" | "cash_out",
            description: isSafeBoxDeposit
              ? `${movement.notes?.split(" - ")[0]}: ${formatCurrency(Number(movement.amount))}`
              : movement.type === "cash_in"
                ? `Ingreso efectivo: ${formatCurrency(Number(movement.amount))}`
                : `Retiro efectivo: ${formatCurrency(Number(movement.amount))}`,
            time: movement.created_at,
            user: "",
            notes: isSafeBoxDeposit ? null : movement.notes,
            amount: Number(movement.amount),
          });
        }
      }

      // Sort by time descending
      activitiesList.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );
      setActivities(activitiesList);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setIsLoadingActivities(false);
    }
  }, [shift]);

  // Load summary when dialog opens
  useEffect(() => {
    if (isOpen && shift?.id) {
      setIsLoadingSummary(true);
      getShiftSummaryAction(shift.id)
        .then((data) => setSummary(data))
        .catch((err) => console.error("Error loading summary:", err))
        .finally(() => setIsLoadingSummary(false));
    }
  }, [isOpen, shift?.id]);

  // Load activities when dialog opens or detail expands
  useEffect(() => {
    if (isOpen && showDetail) {
      loadActivities();
    }
  }, [isOpen, showDetail, loadActivities]);

  // Handlers
  const handleDepositToSafeBox = async () => {
    if (!depositSafeBoxId || depositAmount <= 0) return;
    setIsDepositing(true);
    try {
      await onDepositToSafeBox(
        depositSafeBoxId,
        depositAmount,
        depositNotes || undefined,
      );
      setDepositDialogOpen(false);
      resetDepositForm();
      onRefresh?.();
      loadActivities();
    } finally {
      setIsDepositing(false);
    }
  };

  const resetDepositForm = () => {
    setDepositSafeBoxId("");
    setDepositAmount(0);
    setDepositNotes("");
  };

  const handleCloseShift = async (
    countedAmount: number,
    leftInCash: number,
    discrepancyNotes?: string,
    safeBoxDeposit?: { safeBoxId: string; amount: number },
  ) => {
    await onCloseShift(
      countedAmount,
      leftInCash,
      discrepancyNotes,
      safeBoxDeposit,
    );
    setIsOpen(false);
  };

  // Formatting
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "d/M/yyyy, HH:mm:ss", { locale: es });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              Ver turno
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Turno abierto - {shift.cash_register?.name}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[500px] overflow-y-auto py-4">
            <div className="space-y-4">
              {/* Action buttons */}
              {safeBoxes.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDepositDialogOpen(true)}
                  >
                    Depositar en caja fuerte
                  </Button>
                </div>
              )}

              {/* Collections summary */}
              {isLoadingSummary || !summary ? (
                <div className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="rounded-lg border p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Cobranzas brutas
                        </span>
                        <span>{formatCurrency(summary.grossCollections)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Devoluciones</span>
                        <span>{formatCurrency(summary.refunds)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-medium">
                        <span>Cobranzas netas</span>
                        <span>{formatCurrency(summary.netCollections)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail toggle and current amount */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetail(!showDetail)}
                    >
                      {showDetail ? "Ocultar detalle" : "Ver detalle"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Monto en caja: {formatCurrency(summary.currentCashAmount)}
                    </span>
                  </div>
                </>
              )}

              {/* Activities list */}
              {showDetail && (
                <div className="rounded-lg border p-4">
                  {isLoadingActivities ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No hay actividades
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="text-sm">
                          <div className="font-medium">
                            {activity.saleId ? (
                              <>
                                {activity.description.split(" - ")[0]}
                                {" - "}
                                <Link
                                  href={`/ventas/${activity.saleId}`}
                                  className="text-blue-500 hover:underline"
                                  onClick={() => setIsOpen(false)}
                                >
                                  {activity.saleNumber}
                                </Link>
                              </>
                            ) : (
                              activity.description
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.user && `${activity.user} - `}
                            {formatDateTime(activity.time)}
                          </div>
                          {activity.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">
                              {activity.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {onChangeCashRegister && (
              <Button variant="outline" onClick={onChangeCashRegister}>
                Cambiar caja
              </Button>
            )}
            <CloseShiftDialog
              shift={{
                id: shift.id,
                cashRegisterName: shift.cash_register?.name || "Caja",
                currentCashAmount: summary?.currentCashAmount ?? 0,
              }}
              safeBoxes={safeBoxes}
              onCloseShift={handleCloseShift}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit to safe box dialog */}
      <Dialog
        open={depositDialogOpen}
        onOpenChange={(open) => {
          setDepositDialogOpen(open);
          if (!open) resetDepositForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Depositar en caja fuerte</DialogTitle>
            <DialogDescription>
              Transferi efectivo de la caja registradora a una caja fuerte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caja fuerte *</Label>
              <Select
                value={depositSafeBoxId}
                onValueChange={setDepositSafeBoxId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja fuerte" />
                </SelectTrigger>
                <SelectContent>
                  {safeBoxes.map((sb) => (
                    <SelectItem key={sb.id} value={sb.id}>
                      {sb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <CurrencyInput
                value={depositAmount}
                onValueChange={setDepositAmount}
                placeholder="0,00"
                className="w-full"
                isAllowed={(values) =>
                  values.floatValue === undefined ||
                  values.floatValue <= (summary?.currentCashAmount ?? 0)
                }
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Disponible en caja:{" "}
                {formatCurrency(summary?.currentCashAmount ?? 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                placeholder="Motivo del deposito..."
                maxLength={500}
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDepositDialogOpen(false);
                resetDepositForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDepositToSafeBox}
              disabled={
                !depositSafeBoxId ||
                depositAmount <= 0 ||
                depositAmount > (summary?.currentCashAmount ?? 0) ||
                isDepositing
              }
            >
              {isDepositing ? "Depositando..." : "Confirmar deposito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
