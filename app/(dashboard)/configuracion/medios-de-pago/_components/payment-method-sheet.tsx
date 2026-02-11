// _components/payment-method-sheet.tsx

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PaymentMethod, PaymentMethodType } from "@/types/payment-method";
import { PAYMENT_TYPE_CONFIG } from "@/types/payment-method";
import {
  Banknote,
  Building2,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileCheck,
} from "lucide-react";
import { PaymentMethodForm, type BankAccountOption } from "./payment-method-form";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  FileCheck,
  CreditCard,
  Building2,
  DollarSign,
};

interface PaymentMethodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStep: "type-selector" | "form";
  selectedType: PaymentMethodType | null;
  paymentMethod?: PaymentMethod;
  bankAccounts?: BankAccountOption[];
  onTypeSelect: (type: PaymentMethodType) => void;
  onBack: () => void;
  onSuccess: () => void;
}

export function PaymentMethodSheet({
  open,
  onOpenChange,
  currentStep,
  selectedType,
  paymentMethod,
  bankAccounts,
  onTypeSelect,
  onBack,
  onSuccess,
}: PaymentMethodSheetProps) {
  // Si es edición, siempre mostrar el formulario
  const effectiveStep = paymentMethod ? "form" : currentStep;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md ">
        <SheetHeader>
          <SheetTitle>Agregar Medio de Pago</SheetTitle>
          <SheetDescription className="hidden"></SheetDescription>
        </SheetHeader>

        {/* Paso 1: Selector de Tipo */}
        {effectiveStep === "type-selector" && (
          <div className="space-y-2  px-4">
            {(
              Object.entries(PAYMENT_TYPE_CONFIG) as [
                PaymentMethodType,
                (typeof PAYMENT_TYPE_CONFIG)[keyof typeof PAYMENT_TYPE_CONFIG],
              ][]
            ).map(([type, config]) => {
              const Icon = ICON_MAP[config.icon];

              return (
                <Button
                  key={type}
                  variant="ghost"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => onTypeSelect(type)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 border rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {Icon && <Icon className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">{config.label}</p>
                      <p className="text-sm line-clamp-2 text-left text-balance text-muted-foreground font-normal">
                        {config.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              );
            })}
          </div>
        )}

        {/* Paso 2: Formulario */}
        {currentStep === "form" && (selectedType || paymentMethod) && (
          <div className="space-y-4  px-4">
            {/* Formulario */}
            <PaymentMethodForm
              onClick={onBack}
              type={selectedType || paymentMethod!.type}
              paymentMethod={paymentMethod}
              bankAccounts={bankAccounts}
              onSuccess={() => {
                onSuccess();
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
