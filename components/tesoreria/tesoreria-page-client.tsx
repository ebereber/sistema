"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TreasuryOverview } from "@/lib/services/treasury-cached";
import { Banknote, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface TesoreriaPageClientProps {
  overview: TreasuryOverview;
}

export function TesoreriaPageClient({ overview }: TesoreriaPageClientProps) {
  const {
    bankAccounts,
    cashRegisters,
    safeBoxes,
    totalBanks,
    totalCash,
    totalSafes,
    totalTreasury,
  } = overview;

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tesorería</h2>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <Landmark className="size-4 text-muted-foreground" />
                Total en cuentas bancarias
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                $ {totalBanks.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <Banknote className="size-4 text-muted-foreground" />
                Total en cajas
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                $ {totalCash.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Total en cajas fuertes
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                $ {totalSafes.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="text-sm text-muted-foreground">
                Total en Tesorería
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                $ {totalTreasury.toLocaleString("es-AR")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Cuentas Bancarias */}
        {bankAccounts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Cuentas Bancarias</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {bankAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/tesoreria/${account.id}?type=bank`}
                  className="group/item flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-sm outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Landmark className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="text-sm font-medium">{account.name}</div>
                    <p className="text-sm leading-normal text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                  <div className="text-lg font-bold">
                    {account.currency === "USD" ? "US$" : "$"}{" "}
                    {account.balance.toLocaleString("es-AR")}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cajas de Efectivo */}
        {cashRegisters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Cajas de Efectivo</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cashRegisters.map((account) => (
                <Link
                  key={account.id}
                  href={`/tesoreria/${account.id}?type=cash`}
                  className="group/item flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-sm outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Banknote className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="text-sm font-medium">{account.name}</div>
                    <p className="text-sm leading-normal text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                  <div className="text-lg font-bold">
                    $ {account.balance.toLocaleString("es-AR")}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cajas Fuertes */}
        {safeBoxes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Cajas Fuertes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {safeBoxes.map((account) => (
                <Link
                  key={account.id}
                  href={`/tesoreria/${account.id}?type=safe`}
                  className="group/item flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-sm outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="text-sm font-medium">{account.name}</div>
                    <p className="text-sm leading-normal text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                  <div className="text-lg font-bold">
                    {account.currency === "USD" ? "US$" : "$"}{" "}
                    {account.balance.toLocaleString("es-AR")}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
