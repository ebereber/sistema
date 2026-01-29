"use client";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getLastClosedShift } from "@/lib/services/shifts";
import { useEffect, useState } from "react";

interface OpenShiftDialogProps {
  cashRegisterId?: string;
  cashRegisterName?: string;
  onOpenShift?: (openingAmount: number) => Promise<void>;
  onChangeCashRegister?: () => void;
  trigger?: React.ReactNode;
}

export function OpenShiftDialog({
  cashRegisterId,
  cashRegisterName = "Caja Principal",
  onOpenShift,
  onChangeCashRegister,
  trigger,
}: OpenShiftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [previousAmount, setPreviousAmount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [showEditAmount, setShowEditAmount] = useState(false);

  // Load previous shift amount when dialog opens
  useEffect(() => {
    async function loadPreviousAmount() {
      if (!isOpen || !cashRegisterId) return;

      setIsLoadingPrevious(true);
      try {
        const lastShift = await getLastClosedShift(cashRegisterId);
        if (
          lastShift?.left_in_cash !== null &&
          lastShift?.left_in_cash !== undefined
        ) {
          setPreviousAmount(Number(lastShift.left_in_cash));
          setOpeningAmount(Number(lastShift.left_in_cash));
        } else {
          setPreviousAmount(null);
          setShowEditAmount(true);
        }
      } catch (error) {
        console.error("Error loading previous shift:", error);
        setPreviousAmount(null);
        setShowEditAmount(true);
      } finally {
        setIsLoadingPrevious(false);
      }
    }

    loadPreviousAmount();
  }, [isOpen, cashRegisterId]);

  const handleOpenShift = async () => {
    if (onOpenShift) {
      setIsSubmitting(true);
      try {
        await onOpenShift(openingAmount);
        setIsOpen(false);
        resetState();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleConfirmPrevious = async () => {
    if (previousAmount !== null) {
      setOpeningAmount(previousAmount);
      await handleOpenShift();
    }
  };

  const resetState = () => {
    setOpeningAmount(0);
    setPreviousAmount(null);
    setShowEditAmount(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>Abrir caja</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir turno - {cashRegisterName}</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {isLoadingPrevious ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : previousAmount !== null && !showEditAmount ? (
            // Show previous amount with confirm option
            <div className="flex flex-col items-center space-y-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Monto inicial</p>
                <p className="text-4xl font-bold">
                  {formatCurrency(previousAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Monto del turno anterior
                </p>
              </div>
            </div>
          ) : (
            // Show input for manual amount
            <div className="space-y-2">
              <Label htmlFor="openingAmount">Efectivo contado</Label>
              <CurrencyInput
                id="openingAmount"
                value={openingAmount}
                onValueChange={setOpeningAmount}
                placeholder="0,00"
                className="w-full"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Ingresá el monto de efectivo que hay en caja al iniciar el turno
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {previousAmount !== null && !showEditAmount ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowEditAmount(true)}
                disabled={isSubmitting}
              >
                Editar monto
              </Button>
              <Button onClick={handleConfirmPrevious} disabled={isSubmitting}>
                {isSubmitting ? "Abriendo..." : "Confirmar"}
              </Button>
            </>
          ) : (
            <>
              {onChangeCashRegister && (
                <Button variant="outline" onClick={onChangeCashRegister}>
                  Cambiar caja
                </Button>
              )}
              <Button onClick={handleOpenShift} disabled={isSubmitting}>
                {isSubmitting ? "Abriendo..." : "Abrir turno"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
