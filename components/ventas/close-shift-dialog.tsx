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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
interface ActiveShiftData {
  id: string;
  cashRegisterName: string;
  currentCashAmount: number;
}

type Step = "count" | "discrepancy" | "distribute" | "confirm";

interface CloseShiftDialogProps {
  shift: ActiveShiftData;
  safeBoxes: Array<{ id: string; name: string }>;
  onCloseShift?: (
    countedAmount: number,
    leftInCash: number,
    notes?: string,
    safeBoxDeposit?: { safeBoxId: string; amount: number },
  ) => void;
  trigger?: React.ReactNode;
}

export function CloseShiftDialog({
  shift,
  safeBoxes,
  onCloseShift,
  trigger,
}: CloseShiftDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("count");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [countedAmount, setCountedAmount] = useState<number>(0);
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [leftInCash, setLeftInCash] = useState<number>(0);

  // Safe box deposit
  const [selectedSafeBoxId, setSelectedSafeBoxId] = useState<string>("none");
  const [depositToSafeAmount, setDepositToSafeAmount] = useState<number>(0);

  // Calculations
  const expectedAmount = shift.currentCashAmount;
  const discrepancy = countedAmount - expectedAmount;
  const hasDiscrepancy = Math.abs(discrepancy) >= 1; // $1 tolerance

  const safeDeposit = selectedSafeBoxId !== "none" ? depositToSafeAmount : 0;
  const withdrawAmount = countedAmount - leftInCash - safeDeposit;
  const isDistributionValid =
    leftInCash + safeDeposit <= countedAmount &&
    leftInCash >= 0 &&
    safeDeposit >= 0;

  const selectedSafeBoxName =
    selectedSafeBoxId !== "none"
      ? safeBoxes.find((sb) => sb.id === selectedSafeBoxId)?.name
      : null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);

  const handleContinue = () => {
    if (currentStep === "count") {
      if (hasDiscrepancy) {
        setCurrentStep("discrepancy");
      } else {
        setCurrentStep("distribute");
      }
    } else if (currentStep === "discrepancy") {
      setCurrentStep("distribute");
    } else if (currentStep === "distribute") {
      setCurrentStep("confirm");
    }
  };

  const handleBack = () => {
    if (currentStep === "discrepancy") {
      setCurrentStep("count");
    } else if (currentStep === "distribute") {
      setCurrentStep(hasDiscrepancy ? "discrepancy" : "count");
    } else if (currentStep === "confirm") {
      setCurrentStep("distribute");
    }
  };

  const handleCloseAndLeaveAll = () => {
    setLeftInCash(countedAmount);
    setSelectedSafeBoxId("none");
    setDepositToSafeAmount(0);
    setCurrentStep("confirm");
  };

  const handleCloseShift = async () => {
    if (onCloseShift) {
      setIsSubmitting(true);
      try {
        const safeBoxDeposit =
          selectedSafeBoxId !== "none" && depositToSafeAmount > 0
            ? { safeBoxId: selectedSafeBoxId, amount: depositToSafeAmount }
            : undefined;

        await onCloseShift(
          countedAmount,
          leftInCash,
          discrepancyNotes || undefined,
          safeBoxDeposit,
        );
        setIsOpen(false);
        resetForm();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setCurrentStep("count");
    setCountedAmount(0);
    setDiscrepancyReason("");
    setDiscrepancyNotes("");
    setLeftInCash(0);
    setSelectedSafeBoxId("none");
    setDepositToSafeAmount(0);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const setQuickAmount = (amount: number) => {
    setLeftInCash(amount);
  };

  const handleSafeBoxChange = (value: string) => {
    setSelectedSafeBoxId(value);
    if (value === "none") {
      setDepositToSafeAmount(0);
    }
  };

  const maxSafeDeposit = countedAmount - leftInCash;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="destructive">Cerrar turno</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cerrar turno - {shift.cashRegisterName}</DialogTitle>
          <DialogDescription>
            {currentStep === "count" && "Conta el efectivo en caja."}
            {currentStep === "discrepancy" &&
              "Indica el motivo de la diferencia."}
            {currentStep === "distribute" && "Distribui el efectivo."}
            {currentStep === "confirm" && "Confirma el cierre del turno."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-72 py-4">
          {/* Step 1: Count cash */}
          {currentStep === "count" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="countedAmount">Efectivo contado</Label>
                <CurrencyInput
                  id="countedAmount"
                  value={countedAmount}
                  onValueChange={setCountedAmount}
                  placeholder="0,00"
                  className="w-full"
                  autoFocus
                />
              </div>

              <div className="rounded-lg border p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Efectivo esperado
                    </span>
                    <span className="font-medium">
                      {formatCurrency(expectedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Efectivo contado
                    </span>
                    <span className="font-medium">
                      {formatCurrency(countedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Diferencia</span>
                    <span
                      className={cn(
                        "font-medium",
                        hasDiscrepancy &&
                          "text-yellow-600 dark:text-yellow-400",
                      )}
                    >
                      {formatCurrency(discrepancy)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Discrepancy reason */}
          {currentStep === "discrepancy" && (
            <div className="space-y-6">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {discrepancy < 0 ? "Faltante" : "Sobrante"} de{" "}
                  {formatCurrency(Math.abs(discrepancy))}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discrepancyReason">
                  Motivo de la diferencia
                </Label>
                <Select
                  value={discrepancyReason}
                  onValueChange={setDiscrepancyReason}
                >
                  <SelectTrigger id="discrepancyReason">
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wrong-charge">
                      Cobro mal registrado
                    </SelectItem>
                    <SelectItem value="counting-error">
                      Error de conteo
                    </SelectItem>
                    <SelectItem value="unregistered-withdrawal">
                      Retiro no registrado
                    </SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discrepancyNotes">Nota (opcional)</Label>
                <Textarea
                  id="discrepancyNotes"
                  placeholder="Agrega detalles sobre la diferencia..."
                  maxLength={500}
                  rows={2}
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Distribute cash */}
          {currentStep === "distribute" && (
            <div className="space-y-6">
              {/* Safe box deposit */}
              {safeBoxes.length > 0 && (
                <div className="space-y-2 flex flex-col">
                  <Label>Guardar en caja fuerte</Label>
                  <div className="flex gap-4">
                    <Select
                      value={selectedSafeBoxId}
                      onValueChange={handleSafeBoxChange}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sin deposito" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin deposito</SelectItem>
                        {safeBoxes.map((sb) => (
                          <SelectItem key={sb.id} value={sb.id}>
                            {sb.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSafeBoxId !== "none" && (
                      <CurrencyInput
                        value={depositToSafeAmount}
                        onValueChange={setDepositToSafeAmount}
                        placeholder="0,00"
                        className=" w-full"
                        isAllowed={(values) =>
                          values.floatValue === undefined ||
                          values.floatValue <= countedAmount
                        }
                      />
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Dejar en caja</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="border-dashed"
                    onClick={() => setQuickAmount(0)}
                  >
                    $0
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="border-dashed"
                    onClick={() => setQuickAmount(countedAmount)}
                  >
                    Todo ({formatCurrency(countedAmount)})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="border-dashed"
                    onClick={() => setQuickAmount(5000)}
                  >
                    $5.000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="border-dashed"
                    onClick={() => setQuickAmount(10000)}
                  >
                    $10.000
                  </Button>
                  {selectedSafeBoxId !== "none" &&
                    depositToSafeAmount > 0 &&
                    countedAmount - depositToSafeAmount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="border-dashed border-green-400 text-green-400"
                        onClick={() =>
                          setQuickAmount(countedAmount - depositToSafeAmount)
                        }
                      >
                        Dejar resto (
                        {formatCurrency(countedAmount - depositToSafeAmount)})
                      </Button>
                    )}
                </div>
                <CurrencyInput
                  value={leftInCash}
                  onValueChange={setLeftInCash}
                  placeholder="0,00"
                  className="w-full"
                  isAllowed={(values) =>
                    values.floatValue === undefined ||
                    values.floatValue <= countedAmount
                  }
                />
              </div>

              <div className="rounded-lg border p-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Queda en caja</span>
                    <span className="font-medium">
                      {formatCurrency(leftInCash)}
                    </span>
                  </div>
                  {selectedSafeBoxId !== "none" && depositToSafeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Caja fuerte ({selectedSafeBoxName})</span>
                      <span className="font-medium">
                        {formatCurrency(depositToSafeAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Se retira</span>
                    <span className="font-medium">
                      {formatCurrency(Math.max(0, withdrawAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-medium">
                    <span>Total asignado</span>
                    <span
                      className={cn(
                        isDistributionValid
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {formatCurrency(
                        leftInCash +
                          depositToSafeAmount +
                          Math.max(0, withdrawAmount),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-medium">Resumen del cierre</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caja</span>
                    <span>{shift.cashRegisterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Efectivo esperado
                    </span>
                    <span>{formatCurrency(expectedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Efectivo contado
                    </span>
                    <span>{formatCurrency(countedAmount)}</span>
                  </div>
                  {hasDiscrepancy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Diferencia</span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {formatCurrency(discrepancy)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-medium">Distribucion</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Queda en caja</span>
                    <span>{formatCurrency(leftInCash)}</span>
                  </div>
                  {selectedSafeBoxId !== "none" && depositToSafeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Deposito en caja fuerte ({selectedSafeBoxName})
                      </span>
                      <span>{formatCurrency(depositToSafeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Se retira</span>
                    <span>{formatCurrency(Math.max(0, withdrawAmount))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {currentStep === "count" ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {!hasDiscrepancy && countedAmount > 0 && (
                  <Button variant="outline" onClick={handleCloseAndLeaveAll}>
                    Cerrar y dejar todo
                  </Button>
                )}
                <Button onClick={handleContinue} disabled={countedAmount === 0}>
                  Continuar
                </Button>
              </div>
            </>
          ) : currentStep === "confirm" ? (
            <>
              <Button variant="outline" onClick={handleBack}>
                Atras
              </Button>
              <Button
                variant="destructive"
                onClick={handleCloseShift}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Cerrando..." : "Cerrar turno"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Atras
              </Button>
              <Button
                onClick={handleContinue}
                disabled={currentStep === "distribute" && !isDistributionValid}
              >
                Continuar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
