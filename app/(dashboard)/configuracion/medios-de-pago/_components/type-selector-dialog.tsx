"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PaymentMethodType } from "@/types/payment-method";
import { PAYMENT_TYPE_CONFIG } from "@/types/payment-method";
import {
  Banknote,
  Building2,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileCheck,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  FileCheck,
  CreditCard,
  Building2,
  DollarSign,
};

interface TypeSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeSelect: (type: PaymentMethodType) => void;
}

export function TypeSelectorDialog({
  open,
  onOpenChange,
  onTypeSelect,
}: TypeSelectorDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Agregar Medio de Pago</SheetTitle>
        </SheetHeader>
        <SheetDescription className="hidden"></SheetDescription>

        <div className="space-y-2 px-4">
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
                    <p className="text-sm text-muted-foreground font-normal">
                      {config.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
