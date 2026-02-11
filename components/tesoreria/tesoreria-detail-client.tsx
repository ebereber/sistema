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
import type { TreasuryAccountDetail } from "@/lib/services/treasury-cached";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface TesoreriaDetailClientProps {
  account: TreasuryAccountDetail;
}

export function TesoreriaDetailClient({
  account,
}: TesoreriaDetailClientProps) {
  const currencySymbol = account.currency === "USD" ? "US$" : "$";

  const subtitleByType: Record<string, string> = {
    bank: "Cuenta bancaria",
    cash: "Caja de efectivo",
    safe: "Caja fuerte",
  };

  const movementsLabel: Record<string, string> = {
    bank: "Mostrando movimientos de la cuenta bancaria",
    cash: "Mostrando turnos de caja cerrados",
    safe: "Mostrando movimientos de la caja fuerte",
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
          {movementsLabel[account.accountType]}
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
                {account.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {movement.date}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.reference ? (
                        <span className="font-mono text-sm">
                          {movement.reference}
                        </span>
                      ) : (
                        <span className="font-mono text-sm">-</span>
                      )}
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
