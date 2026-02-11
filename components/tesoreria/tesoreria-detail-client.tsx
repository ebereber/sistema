"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TreasuryAccountDetail,
  TreasuryMovement,
} from "@/lib/services/treasury-cached";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface TesoreriaDetailClientProps {
  account: TreasuryAccountDetail;
}

function ReferenceLink({
  reference,
  sourceId,
  sourceType,
}: {
  reference: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
}) {
  if (!reference) return <span className="text-muted-foreground">-</span>;

  if (sourceType === "customer_payment" && sourceId) {
    return (
      <Link
        href={`/cobranzas/${sourceId}`}
        className="font-mono text-sm underline-offset-4 hover:underline"
      >
        {reference}
      </Link>
    );
  }

  if (sourceType === "supplier_payment" && sourceId) {
    return (
      <Link
        href={`/pagos/${sourceId}`}
        className="font-mono text-sm underline-offset-4 hover:underline"
      >
        {reference}
      </Link>
    );
  }

  return (
    <span className="font-mono text-sm text-muted-foreground">{reference}</span>
  );
}

export function TesoreriaDetailClient({ account }: TesoreriaDetailClientProps) {
  const currencySymbol = account.currency === "USD" ? "US$" : "$";

  const subtitleByType: Record<string, string> = {
    bank: "Cuenta bancaria",
    cash: "Caja de efectivo",
    safe: "Caja fuerte",
  };

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header con breadcrumb y balance */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          {/* Breadcrumb */}
          <Link
            href="/tesoreria"
            className="inline-flex items-center gap-1.5 px-0 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Tesorería
            <ChevronRight className="size-3" />
          </Link>

          {/* Título y descripción */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{account.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {account.description} · {subtitleByType[account.accountType]}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="text-3xl font-bold">
          {currencySymbol}{" "}
          {account.balance.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div>
        <p className="pb-2 text-sm text-muted-foreground">
          Mostrando movimientos recientes
        </p>

        {account.movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay movimientos registrados
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.movements.map((movement: TreasuryMovement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {movement.date}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <ReferenceLink
                        reference={movement.reference}
                        sourceId={movement.sourceId}
                        sourceType={movement.sourceType}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.description || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${movement.isPositive ? "text-green-600" : "text-red-600"}`}
                    >
                      {movement.isPositive ? "+" : "-"} {currencySymbol}{" "}
                      {movement.amount.toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
