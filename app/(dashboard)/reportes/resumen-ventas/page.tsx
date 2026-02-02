import {
  SalesByPaymentChart,
  SalesByPosChart,
  SalesByReceiptChart,
  SalesBySellerChart,
  SalesChart,
  SalesMetricsTabs,
} from "@/components/reportes/reportes-ventas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  ChevronRight,
  CirclePlus,
  FileSpreadsheet,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resumen de Ventas",
  description: "Dashboard de ventas con métricas y gráficos",
};

export default function ResumenVentasPage() {
  return (
    <div className="flex h-full flex-1 flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="gap-4">
          <Link
            href="/local-1/reportes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline underline-offset-4"
          >
            Reportes
            <ChevronRight className="size-3" />
          </Link>
          <h1 className="font-bold text-xl tracking-tight md:text-3xl">
            Resumen de Ventas
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex w-full flex-col items-start justify-between gap-2 md:w-auto md:flex-row md:items-center">
          <div className="flex w-full flex-col items-start gap-2 md:w-auto md:flex-row md:items-center">
            <Button
              variant="outline"
              className="w-full md:w-auto justify-start border-dashed active:scale-100"
            >
              <Calendar className="size-4" />
              Período
              <Separator orientation="vertical" className="mx-2 h-4" />
              <span className="font-normal text-muted-foreground">
                Últimos 30 días
              </span>
            </Button>

            <Button
              variant="outline"
              className="w-full md:w-auto justify-start border-dashed active:scale-[0.97]"
            >
              <CirclePlus className="mr-2 h-4 w-4" />
              Punto de Venta
            </Button>

            <Button
              variant="outline"
              className="w-full md:w-auto justify-start border-dashed active:scale-[0.97]"
            >
              <CirclePlus className="mr-2 h-4 w-4" />
              Vendedor
            </Button>
          </div>

          <Button variant="outline" className="active:scale-[0.97]">
            <FileSpreadsheet className="size-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Main Chart with Tabs - Desktop */}
        <div className="hidden md:block">
          <SalesMetricsTabs />
        </div>

        {/* Mobile Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          <Card>
            <CardHeader className="gap-0.5">
              <CardDescription className="text-sm font-semibold text-foreground/80">
                Total Vendido
              </CardDescription>
              <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                $ 14.245
                <span className="font-medium text-sm text-green-600">
                  +100.0%
                </span>
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                $ 0 el período anterior
              </div>
            </CardHeader>
            <CardContent>
              <SalesChart chartId="chart-mobile-1" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-0.5">
              <CardDescription className="text-sm font-semibold text-foreground/80">
                Cantidad de Ventas
              </CardDescription>
              <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                56
                <span className="font-medium text-sm text-green-600">
                  +100.0%
                </span>
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                0 el período anterior
              </div>
            </CardHeader>
            <CardContent>
              <SalesChart chartId="chart-mobile-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-0.5">
              <CardDescription className="text-sm font-semibold text-foreground/80">
                Promedio por Venta
              </CardDescription>
              <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                $ 254
                <span className="font-medium text-sm text-green-600">
                  +100.0%
                </span>
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                $ 0 el período anterior
              </div>
            </CardHeader>
            <CardContent>
              <SalesChart chartId="chart-mobile-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-0.5">
              <CardDescription className="text-sm font-semibold text-foreground/80">
                Unidades Vendidas
              </CardDescription>
              <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                145
                <span className="font-medium text-sm text-green-600">
                  +100.0%
                </span>
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                0 el período anterior
              </div>
            </CardHeader>
            <CardContent>
              <SalesChart chartId="chart-mobile-4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-0.5">
              <CardDescription className="text-sm font-semibold text-foreground/80">
                Margen Bruto
              </CardDescription>
              <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                $ 11.894
                <span className="font-medium text-sm text-green-600">
                  +100.0%
                </span>
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                $ 0 el período anterior
              </div>
            </CardHeader>
            <CardContent>
              <SalesChart chartId="chart-mobile-5" />
            </CardContent>
          </Card>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesBySellerChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Punto de Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByPosChart />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Medio de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByPaymentChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Tipo de Comprobante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByReceiptChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
