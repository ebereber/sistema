"use client";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import Image from "next/image";
import { CARD_TYPES, type CardType } from "./types";

interface PaymentCardSelectProps {
  onCardTypeSelect: (card: CardType) => void;
  onBack: () => void;
  onTransferClick: () => void;
}

export function PaymentCardSelect({
  onCardTypeSelect,
  onBack,
  onTransferClick,
}: PaymentCardSelectProps) {
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription>Seleccioná el tipo de tarjeta</CardDescription>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Atrás
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CARD_TYPES.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onCardTypeSelect(card)}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/50"
            >
              <Image
                src={card.icon}
                alt={card.name}
                width={48}
                height={32}
                className="h-8 w-auto object-contain"
              />
              <span className="text-center text-xs font-medium">
                {card.name}
              </span>
            </button>
          ))}
        </div>

        <Separator />

        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            O pagar con QR / Transferencia
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onTransferClick}
          >
            <Smartphone className="mr-2 h-4 w-4" />
            QR / Transferencia
          </Button>
        </div>
      </CardContent>
    </>
  );
}

interface PaymentCardFormProps {
  selectedCardType: CardType;
  cardLote: string;
  cardCupon: string;
  isFromSplitPayment: boolean;
  onLoteChange: (value: string) => void;
  onCuponChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function PaymentCardForm({
  selectedCardType,
  cardLote,
  cardCupon,
  isFromSplitPayment,
  onLoteChange,
  onCuponChange,
  onBack,
  onContinue,
}: PaymentCardFormProps) {
  const handleCuponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    onCuponChange(value);
    // Auto-advance when both have 4 digits
    if (value.length === 4 && cardLote.length === 4) {
      setTimeout(() => {
        onContinue();
      }, 300);
    }
  };

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <CardDescription className="flex items-center gap-2">
          <Image
            src={selectedCardType.icon}
            alt={selectedCardType.name}
            width={32}
            height={20}
            className="h-5 w-auto object-contain"
          />
          {selectedCardType.name}
        </CardDescription>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Cambiar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardLote">Lote</Label>
            <input
              id="cardLote"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={cardLote}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                onLoteChange(value);
              }}
              placeholder="0001"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardCupon">Cupón</Label>
            <input
              id="cardCupon"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={cardCupon}
              onChange={handleCuponChange}
              placeholder="0001"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={cardLote.length !== 4 || cardCupon.length !== 4}
          onClick={onContinue}
        >
          {isFromSplitPayment ? "Agregar pago" : "Continuar"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </>
  );
}
