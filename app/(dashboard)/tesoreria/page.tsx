"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Banknote, Landmark, ShieldCheck } from "lucide-react";
import Link from "next/link";

// Tipos de datos
interface TreasuryAccount {
  id: string;
  name: string;
  description: string;
  balance: number;
  type: "bank" | "cash" | "safe";
  icon: "landmark" | "banknote";
}

// Datos de ejemplo
const treasuryAccounts: TreasuryAccount[] = [
  {
    id: "946d0f42-42bf-49ba-a71e-ded7f4091544",
    name: "Naranja",
    description: "Naranjapos",
    balance: 30000,
    type: "bank",
    icon: "landmark",
  },
  {
    id: "99acfeb3-8a9d-4e89-8870-291d3561079e",
    name: "Principal",
    description: "Banco",
    balance: 15183,
    type: "bank",
    icon: "landmark",
  },
  {
    id: "3ad20ed4-8b2e-447a-9fbf-16c56feba004",
    name: "Caja chica",
    description: "Principal",
    balance: 42356,
    type: "cash",
    icon: "banknote",
  },
  {
    id: "e9e5f361-596b-4cb0-b0e7-5b7664afa13d",
    name: "Caja grande",
    description: "Ubicación",
    balance: 0,
    type: "safe",
    icon: "banknote",
  },
];

export default function TesoreriaPage() {
  // Calcular totales
  const totalBanks = treasuryAccounts
    .filter((acc) => acc.type === "bank")
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalCash = treasuryAccounts
    .filter((acc) => acc.type === "cash")
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalSafes = treasuryAccounts
    .filter((acc) => acc.type === "safe")
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalTreasury = totalBanks + totalCash + totalSafes;

  // Filtrar cuentas por tipo
  const bankAccounts = treasuryAccounts.filter((acc) => acc.type === "bank");
  const cashAccounts = treasuryAccounts.filter((acc) => acc.type === "cash");
  const safeAccounts = treasuryAccounts.filter((acc) => acc.type === "safe");

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
          {/* Total en cuentas bancarias */}
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

          {/* Total en cajas */}
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

          {/* Total en cajas fuertes */}
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

          {/* Total en Tesorería */}
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
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Cuentas Bancarias</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {bankAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/tesoreria/${account.id}`}
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
                  $ {account.balance.toLocaleString("es-AR")}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Cajas de Efectivo */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Cajas de Efectivo</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cashAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/tesoreria/${account.id}`}
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

        {/* Cajas Fuertes */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Cajas Fuertes</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {safeAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/tesoreria/${account.id}`}
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
      </div>
    </div>
  );
}
