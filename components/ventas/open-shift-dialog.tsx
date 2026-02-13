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
import { getLastClosedShiftAction } from "@/lib/actions/shifts";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
interface OpenShiftDialogProps {
  cashRegisters: { id: string; name: string }[];
  selectedCashRegisterId: string | null;
  onCashRegisterChange: (id: string) => void;
  onOpenShift?: (openingAmount: number) => Promise<void>;
  trigger?: React.ReactNode;
}

export function OpenShiftDialog({
  cashRegisters,
  selectedCashRegisterId,
  onCashRegisterChange,
  onOpenShift,
  trigger,
}: OpenShiftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [previousAmount, setPreviousAmount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [showEditAmount, setShowEditAmount] = useState(false);

  const selectedCashRegister = cashRegisters.find(
    (cr) => cr.id === selectedCashRegisterId,
  );

  // Load previous shift amount when dialog opens or cash register changes
  useEffect(() => {
    async function loadPreviousAmount() {
      if (!isOpen || !selectedCashRegisterId) return;

      setIsLoadingPrevious(true);
      try {
        const lastShift = await getLastClosedShiftAction(
          selectedCashRegisterId,
        );
        console.log("Last shift result:", lastShift); // <-- agregá esto
        if (
          lastShift?.left_in_cash !== null &&
          lastShift?.left_in_cash !== undefined
        ) {
          setPreviousAmount(lastShift.left_in_cash);
          setOpeningAmount(lastShift.left_in_cash);
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
  }, [isOpen, selectedCashRegisterId]);

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
          <DialogTitle>Abrir turno</DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Selector de caja */}
          {cashRegisters.length > 1 && (
            <div className="space-y-2">
              <Label>Caja</Label>
              <Select
                value={selectedCashRegisterId || ""}
                onValueChange={onCashRegisterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cashRegisters.map((cr) => (
                    <SelectItem key={cr.id} value={cr.id}>
                      {cr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {cashRegisters.length === 1 && (
            <p className="text-sm text-muted-foreground text-center">
              {selectedCashRegister?.name}
            </p>
          )}

          {isLoadingPrevious ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : previousAmount !== null && !showEditAmount ? (
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

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            <Button
              onClick={handleOpenShift}
              disabled={isSubmitting || !selectedCashRegisterId}
            >
              {isSubmitting ? "Abriendo..." : "Abrir turno"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
