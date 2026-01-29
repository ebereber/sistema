"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronRight,
  CreditCard,
  File,
  Package,
  Plus,
  SquarePen,
  StickyNote,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Tipos
interface ProductoCompra {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  costoUnitario: number;
  cuenta: string;
}

interface DetalleCompra {
  id: string;
  numeroFactura: string;
  proveedor: {
    id: string;
    nombre: string;
  };
  fechaFactura: Date;
  fechaVencimiento: Date;
  productos: ProductoCompra[];
  subtotal: number;
  impuestos: number;
  total: number;
  saldoPendiente: number;
  netoGravado: number;
  iva: number;
  totalFacturado: number;
  rubroIva: string;
  notas?: string;
}

export default function CompraDetallePage() {
  const [compra] = useState<DetalleCompra>({
    id: "576fc786-f674-4fc3-acbb-4b501b8ad993",
    numeroFactura: "COM - 00001-53453245",
    proveedor: {
      id: "cd5d9f5b-bf19-4cbc-86f9-72d85cba6db7",
      nombre: "Moda Chic",
    },
    fechaFactura: new Date(),
    fechaVencimiento: new Date(2026, 0, 28),
    productos: [
      {
        id: "1",
        nombre: "Buzo Hoodie con Capucha",
        sku: "BZ-009",
        cantidad: 1,
        costoUnitario: 14,
        cuenta: "Mercaderías",
      },
      {
        id: "2",
        nombre: "Campera de Abrigo Puffer",
        sku: "CP-007",
        cantidad: 1,
        costoUnitario: 40,
        cuenta: "Mercaderías",
      },
    ],
    subtotal: 54,
    impuestos: 0,
    total: 54,
    saldoPendiente: 54,
    netoGravado: 54,
    iva: 0,
    totalFacturado: 54,
    rubroIva: "Por ítem",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatFecha = (fecha: Date) => {
    return format(fecha, "d/M/yyyy", { locale: es });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/compras"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Compras
            <ChevronRight className="h-3 w-3" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {formatCurrency(compra.total)}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Comprado a {compra.proveedor.nombre}{" "}
              <span className="font-semibold text-primary">
                <button className="font-semibold text-primary">hoy</button>
              </span>
            </p>
          </div>
        </div>
        <div>
          <Link href={`/compras/${compra.id}/editar`}>
            <Button>
              <SquarePen className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de 3 columnas */}
      <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-5 lg:gap-6">
        {/* Columna principal (izquierda) - 3 columnas */}
        <div className="space-y-6 lg:col-span-3">
          {/* Card de número de factura */}
          <Card className="bg-muted p-4">
            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
              <div className="flex w-full items-center justify-between gap-2 md:w-auto">
                <button className="mx-auto flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  {compra.numeroFactura}
                </button>
              </div>
              <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row"></div>
            </div>
          </Card>

          {/* Card de fecha de vencimiento */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 px-4 py-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Vencimiento</p>
                <p className="font-medium">
                  {formatFecha(compra.fechaVencimiento)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card de Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Productos
                </div>
                <div className="text-sm text-muted-foreground">
                  {compra.productos.reduce((sum, p) => sum + p.cantidad, 0)}{" "}
                  unidades
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <div className="">
                  {compra.productos.map((producto, index) => (
                    <div
                      key={producto.id}
                      className={`py-4 ${
                        index !== compra.productos.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Link
                              href={`/productos/${producto.id}`}
                              className="text-base font-medium underline decoration-muted-foreground underline-offset-4 transition-colors hover:underline"
                            >
                              {producto.nombre}
                            </Link>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {producto.sku}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Cuenta: {producto.cuenta}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold">
                            {formatCurrency(
                              producto.cantidad * producto.costoUnitario,
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {formatCurrency(producto.costoUnitario)}
                            </span>
                            <span>×</span>
                            <Badge className="font-mono text-sm">
                              {producto.cantidad}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="text-sm">
                      {formatCurrency(compra.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Impuestos
                    </span>
                    <span className="text-sm">
                      {formatCurrency(compra.impuestos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-base font-bold">
                      {formatCurrency(compra.total)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Pagos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Pagos
                </div>
                <Link href={`/pagos/nuevo?purchaseId=${compra.id}`}>
                  <Button size="sm">
                    <Plus />
                    Nuevo pago
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Neto gravado
                  </span>
                  <span className="text-sm">${compra.netoGravado}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">IVA</span>
                  <span className="text-sm">${compra.iva}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-primary">
                    Total facturado
                  </span>
                  <span className="text-base font-bold">
                    ${compra.totalFacturado}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-negative">
                    Saldo pendiente
                  </span>
                  <span className="text-sm font-medium text-negative">
                    ${compra.saldoPendiente}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <p className="text-muted-foreground">
                  No hay pagos registrados para esta compra
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral (derecha) - 2 columnas */}
        <div className="col-span-2 space-y-6">
          {/* Card de Proveedor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-muted-foreground" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link
                  href={`/proveedores/${compra.proveedor.id}`}
                  className="px-0 text-lg font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {compra.proveedor.nombre}
                </Link>
                <p> </p>
              </div>
              <div className="space-y-2"></div>
            </CardContent>
          </Card>

          {/* Card de Notas */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                Notas
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                className="h-6 py-0 text-muted-foreground"
              >
                Editar
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">-</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
