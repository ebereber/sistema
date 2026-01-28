"use client";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaymentReferenceFormProps {
  reference: string;
  isFromSplitPayment: boolean;
  onReferenceChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function PaymentReferenceForm({
  reference,
  isFromSplitPayment,
  onReferenceChange,
  onBack,
  onContinue,
}: PaymentReferenceFormProps) {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription>Referencia de la transferencia</CardDescription>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Atrás
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        <div className="space-y-2">
          <Label htmlFor="paymentReference">Comprobante / Referencia</Label>
          <input
            id="paymentReference"
            type="text"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="Ej: CBU, número de operación..."
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Opcional: ingresá un dato para identificar la transferencia
          </p>
        </div>

        <Button type="button" className="w-full" onClick={onContinue}>
          {isFromSplitPayment ? "Agregar pago" : "Aceptar"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </>
  );
}
