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
import { ChevronRight } from "lucide-react";
import Link from "next/link";

// Tipos de datos
interface Movement {
  id: string;
  date: string;
  type: string;
  reference: string | null;
  description: string | null;
  amount: number;
  isPositive: boolean;
}

interface AccountDetail {
  id: string;
  name: string;
  description: string;
  balance: number;
  movements: Movement[];
}

// Datos de ejemplo para diferentes cuentas
const accountsData: Record<string, AccountDetail> = {
  "3ad20ed4-8b2e-447a-9fbf-16c56feba004": {
    id: "3ad20ed4-8b2e-447a-9fbf-16c56feba004",
    name: "Caja chica",
    description: "Principal",
    balance: 42356.0,
    movements: [
      {
        id: "1",
        date: "09/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000011",
        description: null,
        amount: 2356.0,
        isPositive: true,
      },
      {
        id: "2",
        date: "09/02/2026",
        type: "Movimiento manual",
        reference: null,
        description: "Sobrante de caja: Venta no registrada",
        amount: 12288.08,
        isPositive: true,
      },
      {
        id: "3",
        date: "07/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000005",
        description: null,
        amount: 3255.84,
        isPositive: true,
      },
      {
        id: "4",
        date: "07/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000004",
        description: null,
        amount: 2055.6,
        isPositive: true,
      },
      {
        id: "5",
        date: "07/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000002",
        description: null,
        amount: 1200.24,
        isPositive: true,
      },
      {
        id: "6",
        date: "06/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000001",
        description: null,
        amount: 1200.24,
        isPositive: true,
      },
      {
        id: "7",
        date: "05/02/2026",
        type: "Saldo inicial",
        reference: "Saldo inicial",
        description: "Saldo inicial",
        amount: 20000.0,
        isPositive: true,
      },
    ],
  },
  "99acfeb3-8a9d-4e89-8870-291d3561079e": {
    id: "99acfeb3-8a9d-4e89-8870-291d3561079e",
    name: "Principal",
    description: "Banco",
    balance: 15183.25,
    movements: [
      {
        id: "1",
        date: "09/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000010",
        description: null,
        amount: 1700.24,
        isPositive: true,
      },
      {
        id: "2",
        date: "09/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000008",
        description: null,
        amount: 9882.29,
        isPositive: true,
      },
      {
        id: "3",
        date: "08/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000007",
        description: null,
        amount: 1200.24,
        isPositive: true,
      },
      {
        id: "4",
        date: "08/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000006",
        description: null,
        amount: 1200.24,
        isPositive: true,
      },
      {
        id: "5",
        date: "07/02/2026",
        type: "Pago",
        reference: "RCB-00001-00000003",
        description: null,
        amount: 1200.24,
        isPositive: true,
      },
    ],
  },
};

interface TesoreriaDetailPageProps {
  params: {
    id: string;
  };
}

export default function TesoreriaDetailPage({
  params,
}: TesoreriaDetailPageProps) {
  // Obtener los datos de la cuenta según el ID
  const account = accountsData[params.id];

  // Si no existe la cuenta, mostrar mensaje
  if (!account) {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Cuenta no encontrada</p>
        </div>
      </div>
    );
  }

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
            <p className="text-muted-foreground">{account.description}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="text-3xl font-bold">
          ${" "}
          {account.balance.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div>
        <p className="pb-2 text-sm text-muted-foreground">
          Mostrando movimientos de turnos de caja cerrados
        </p>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="font-medium">{movement.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{movement.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {movement.reference ? (
                      movement.reference.startsWith("RCB-") ? (
                        <a
                          href={`/cobranzas/${movement.id}`}
                          className="font-mono text-sm underline-offset-4 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {movement.reference}
                        </a>
                      ) : (
                        <span className="font-mono text-sm">
                          {movement.reference}
                        </span>
                      )
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
                    {movement.isPositive ? "+" : "-"} ${" "}
                    {movement.amount.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
