"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type AvailableCreditNote } from "@/lib/services/credit-note-applications";
import { formatPrice } from "@/lib/validations/sale";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CreditNotesSelectorProps {
  availableCreditNotes: AvailableCreditNote[];
  selectedCreditNotes: Map<string, number>;
  exchangeAmountToPay?: number;
  showDate?: boolean;
  onToggle: (noteId: string, availableBalance: number) => void;
}

export function CreditNotesSelector({
  availableCreditNotes,
  selectedCreditNotes,
  exchangeAmountToPay,
  showDate = false,
  onToggle,
}: CreditNotesSelectorProps) {
  if (availableCreditNotes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Notas de crédito disponibles
      </p>
      {availableCreditNotes.map((nc) => (
        <div key={nc.id} className="flex items-center gap-2">
          <Checkbox
            id={`nc-${nc.id}`}
            checked={selectedCreditNotes.has(nc.id)}
            onCheckedChange={() => onToggle(nc.id, nc.availableBalance)}
            disabled={
              exchangeAmountToPay !== undefined &&
              !selectedCreditNotes.has(nc.id) &&
              exchangeAmountToPay <= 0
            }
          />
          <Label
            htmlFor={`nc-${nc.id}`}
            className="flex flex-1 cursor-pointer items-center justify-between text-sm"
          >
            <div>
              <span className="text-red-600 dark:text-red-400">
                {nc.saleNumber}
              </span>
              {showDate && (
                <span className="text-xs text-muted-foreground ml-2">
                  {format(new Date(nc.createdAt), "dd/MM/yy", { locale: es })}
                </span>
              )}
            </div>
            <span className="text-red-600 dark:text-red-400">
              -{formatPrice(nc.availableBalance)}
            </span>
          </Label>
        </div>
      ))}
    </div>
  );
}
