"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice, type ExchangeResult } from "@/lib/validations/sale";
import {
  Check,
  Download,
  ExternalLink,
  Gift,
  Mail,
  Printer,
} from "lucide-react";
import Link from "next/link";

interface CheckoutConfirmationProps {
  isExchangeMode: boolean;
  exchangeResult: ExchangeResult | null;
  saleNumber: string | null;
  total: number;
  onNewSale: () => void;
  cae?: string | null;
  voucherNumber?: number | null;
  voucherType?: string;
}

export function CheckoutConfirmation({
  isExchangeMode,
  exchangeResult,
  saleNumber,
  total,
  onNewSale,
  cae,
  voucherNumber,
  voucherType,
}: CheckoutConfirmationProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="zoom-in-50 flex h-16 w-16 animate-in items-center justify-center rounded-full bg-green-500/10 fill-mode-both duration-300">
          <Check className="h-10 w-10 text-green-600" strokeWidth={2.5} />
        </div>

        <div className="fade-in slide-in-from-bottom-2 animate-in space-y-2 fill-mode-both delay-100 duration-300">
          <h2 className="text-2xl font-semibold">
            {isExchangeMode ? "¡Cambio confirmado!" : "¡Venta confirmada!"}
          </h2>

          {/* Exchange result details */}
          {isExchangeMode && exchangeResult ? (
            <div className="space-y-3">
              {exchangeResult.creditNote && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Nota de Crédito
                  </p>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300">
                    {exchangeResult.creditNote.saleNumber}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    -{formatPrice(exchangeResult.creditNote.total)}
                  </p>
                </div>
              )}

              {exchangeResult.sale && (
                <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Nueva Venta
                  </p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {exchangeResult.sale.saleNumber}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {formatPrice(exchangeResult.sale.total)}
                  </p>
                </div>
              )}

              {exchangeResult.creditBalance > 0 && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Crédito a favor del cliente:{" "}
                  {formatPrice(exchangeResult.creditBalance)}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-muted-foreground">
                {saleNumber}
              </p>
              <p className="text-3xl font-bold">{formatPrice(total)}</p>
              {cae && (
                <div className="mt-2 rounded-md border bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    CAE: {cae}
                    {voucherNumber != null &&
                      ` | Comp. N° ${String(voucherNumber).padStart(8, "0")}`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="fade-in slide-in-from-bottom-2 flex w-full max-w-sm animate-in flex-col gap-4 fill-mode-both pt-2 delay-200 duration-300">
          <div className="flex justify-center gap-2">
            <Button variant="outline" className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="outline" className="flex-1">
              <svg
                className="mr-2 h-4 w-4"
                fill="currentColor"
                viewBox="0 0 448 512"
              >
                <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
              </svg>
              WhatsApp
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </div>

          <Separator />

          <div className="flex justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Descargar PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Gift className="mr-1.5 h-4 w-4" />
              Ticket de cambio
            </Button>
            {(exchangeResult?.sale || saleNumber) && (
              <Link
                href={`/ventas/${exchangeResult?.sale?.id || saleNumber}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Ver detalles
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onNewSale}
          className="fade-in animate-in fill-mode-both delay-500 duration-300"
        >
          Nueva venta
          <kbd className="ml-2 hidden h-5 min-w-5 select-none items-center justify-center gap-1 rounded-sm border border-muted-foreground/30 px-1 font-sans text-xs font-medium text-muted-foreground md:block">
            Enter
          </kbd>
        </Button>
      </div>
    </div>
  );
}
