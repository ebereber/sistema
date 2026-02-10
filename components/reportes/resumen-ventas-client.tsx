"use client";

import {
  Calendar,
  Check,
  ChevronRight,
  CirclePlus,
  CornerDownRight,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { SalesReportResult } from "@/lib/actions/reports";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FilterOption {
  id: string;
  name: string;
  selected: boolean;
}

interface ResumenVentasClientProps {
  reportData: SalesReportResult;
  locations: { id: string; name: string }[];
  sellers: { id: string; name: string | null }[];
  currentFilters: {
    periodType: string;
    periodValue: string;
    periodUnit: string;
    locationIds: string[];
    sellerIds: string[];
  };
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetricValue(value: number, isCurrency: boolean): string {
  if (isCurrency) return formatCurrency(value);
  return new Intl.NumberFormat("es-AR").format(Math.round(value));
}

function formatChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// ============================================================================
// Component
// ============================================================================

export function ResumenVentasClient({
  reportData,
  locations,
  sellers,
  currentFilters,
}: ResumenVentasClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Period filter state
  const [periodType, setPeriodType] = useState(currentFilters.periodType);
  const [periodValue, setPeriodValue] = useState(currentFilters.periodValue);
  const [periodUnit, setPeriodUnit] = useState(currentFilters.periodUnit);

  // POS filter state
  const [posOptions, setPosOptions] = useState<FilterOption[]>(() =>
    locations.map((l) => ({
      id: l.id,
      name: l.name,
      selected: currentFilters.locationIds.includes(l.id),
    })),
  );

  // Seller filter state
  const [sellerOptions, setSellerOptions] = useState<FilterOption[]>(() =>
    sellers.map((s) => ({
      id: s.id,
      name: s.name || s.id,
      selected: currentFilters.sellerIds.includes(s.id),
    })),
  );

  // Popover states
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [isSellerOpen, setIsSellerOpen] = useState(false);

  // Push filters to URL
  function applyFilters(overrides?: {
    periodType?: string;
    periodValue?: string;
    periodUnit?: string;
    locationIds?: string[];
    sellerIds?: string[];
  }) {
    const params = new URLSearchParams();

    const pt = overrides?.periodType ?? periodType;
    const pv = overrides?.periodValue ?? periodValue;
    const pu = overrides?.periodUnit ?? periodUnit;
    const lids =
      overrides?.locationIds ??
      posOptions.filter((p) => p.selected).map((p) => p.id);
    const sids =
      overrides?.sellerIds ??
      sellerOptions.filter((s) => s.selected).map((s) => s.id);

    if (pt !== "last") params.set("periodType", pt);
    if (pv !== "30") params.set("periodValue", pv);
    if (pu !== "days") params.set("periodUnit", pu);
    if (lids.length > 0) params.set("locationIds", lids.join(","));
    if (sids.length > 0) params.set("sellerIds", sids.join(","));

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  // Period handlers
  const handlePeriodApply = () => {
    setIsPeriodOpen(false);
    applyFilters({
      periodType,
      periodValue,
      periodUnit,
    });
  };

  const getPeriodLabel = () => {
    const unitLabels: Record<string, string> = {
      days: "días",
      weeks: "semanas",
      months: "meses",
      years: "años",
    };
    const unit = unitLabels[periodUnit] || periodUnit;

    if (periodType === "last") return `Últimos ${periodValue} ${unit}`;
    if (periodType === "this")
      return `Este ${periodUnit === "months" ? "mes" : periodUnit === "weeks" ? "semana" : periodUnit === "years" ? "año" : "día"}`;
    return `${periodUnit === "months" ? "Mes" : periodUnit === "weeks" ? "Semana" : periodUnit === "years" ? "Año" : "Día"} anterior`;
  };

  // POS handlers
  const handlePosToggle = (id: string) => {
    setPosOptions((prev) =>
      prev.map((pos) =>
        pos.id === id ? { ...pos, selected: !pos.selected } : pos,
      ),
    );
  };

  const handlePosClear = () => {
    setPosOptions((prev) => prev.map((pos) => ({ ...pos, selected: false })));
  };

  const handlePosApply = () => {
    setIsPosOpen(false);
    applyFilters({
      locationIds: posOptions.filter((p) => p.selected).map((p) => p.id),
    });
  };

  const selectedPosCount = posOptions.filter((p) => p.selected).length;

  // Seller handlers
  const handleSellerToggle = (id: string) => {
    setSellerOptions((prev) =>
      prev.map((seller) =>
        seller.id === id ? { ...seller, selected: !seller.selected } : seller,
      ),
    );
  };

  const handleSellerClear = () => {
    setSellerOptions((prev) =>
      prev.map((seller) => ({ ...seller, selected: false })),
    );
  };

  const handleSellerApply = () => {
    setIsSellerOpen(false);
    applyFilters({
      sellerIds: sellerOptions.filter((s) => s.selected).map((s) => s.id),
    });
  };

  const selectedSellerCount = sellerOptions.filter((s) => s.selected).length;

  // Build props for SalesMetricsTabs
  const metricsForTabs = reportData.metrics.map((m) => ({
    id: m.id,
    label: m.label,
    value: formatMetricValue(m.value, m.isCurrency),
    change: formatChange(m.change),
    changePositive: m.change >= 0,
    previousValue: m.isCurrency
      ? formatCurrency(m.previousValue)
      : new Intl.NumberFormat("es-AR").format(Math.round(m.previousValue)),
  }));
  return (
    <div
      className={cn(
        "flex h-full flex-1 flex-col space-y-6 p-6",
        isPending && "opacity-60 pointer-events-none",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="gap-4">
          <Link
            href="/reportes"
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
            {/* Period Filter */}
            <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-auto justify-start border-dashed active:scale-100"
                >
                  <Calendar className="size-4" />
                  Período
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <span className="font-normal text-muted-foreground">
                    {getPeriodLabel()}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[17rem]" align="start">
                <div className="space-y-4 bg-card">
                  <div>
                    <Label className="font-semibold text-sm">
                      Seleccioná el período de análisis
                    </Label>
                  </div>
                  <div className="space-y-3">
                    <Select value={periodType} onValueChange={setPeriodType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last">en los últimos</SelectItem>
                        <SelectItem value="this">en este</SelectItem>
                        <SelectItem value="previous">en el anterior</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                      <CornerDownRight className="size-3.5 w-12 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="30"
                          value={periodValue}
                          onChange={(e) => setPeriodValue(e.target.value)}
                          className="w-full"
                          disabled={periodType !== "last"}
                        />
                        <Select
                          value={periodUnit}
                          onValueChange={setPeriodUnit}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">días</SelectItem>
                            <SelectItem value="weeks">semanas</SelectItem>
                            <SelectItem value="months">meses</SelectItem>
                            <SelectItem value="years">años</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handlePeriodApply}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Punto de Venta Filter */}
            <Popover open={isPosOpen} onOpenChange={setIsPosOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-auto justify-start border-dashed active:scale-[0.97]"
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Punto de Venta
                  {selectedPosCount > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <span className="font-normal text-muted-foreground">
                        {selectedPosCount} seleccionado
                        {selectedPosCount > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Punto de venta" />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {posOptions.map((pos) => (
                        <CommandItem
                          key={pos.id}
                          value={pos.name}
                          onSelect={() => handlePosToggle(pos.id)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-input",
                              pos.selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "[&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="ml-2 truncate">{pos.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <div className="flex gap-2 p-2">
                        <Button
                          variant="outline"
                          size="default"
                          className="h-8 flex-1"
                          onClick={handlePosClear}
                        >
                          Limpiar
                        </Button>
                        <Button
                          variant="default"
                          size="default"
                          className="h-8 flex-1"
                          onClick={handlePosApply}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Vendedor Filter */}
            <Popover open={isSellerOpen} onOpenChange={setIsSellerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full md:w-auto justify-start border-dashed active:scale-[0.97]"
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Vendedor
                  {selectedSellerCount > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <span className="font-normal text-muted-foreground">
                        {selectedSellerCount} seleccionado
                        {selectedSellerCount > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Vendedor" />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {sellerOptions.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.name}
                          onSelect={() => handleSellerToggle(seller.id)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-[4px] border border-input",
                              seller.selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "[&_svg]:invisible",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span className="ml-2 truncate">{seller.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <div className="flex gap-2 p-2">
                        <Button
                          variant="outline"
                          size="default"
                          className="h-8 flex-1"
                          onClick={handleSellerClear}
                        >
                          Limpiar
                        </Button>
                        <Button
                          variant="default"
                          size="default"
                          className="h-8 flex-1"
                          onClick={handleSellerApply}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" className="active:scale-[0.97]" disabled>
            <FileSpreadsheet className="size-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Main Chart with Tabs - Desktop */}
        <div className="hidden md:block">
          <SalesMetricsTabs
            metrics={metricsForTabs}
            chartData={reportData.chartData}
          />
        </div>

        {/* Mobile Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {reportData.metrics.map((metric) => (
            <Card key={metric.id}>
              <CardHeader className="gap-0.5">
                <CardDescription className="text-sm font-semibold text-foreground/80">
                  {metric.label}
                </CardDescription>
                <CardTitle className="mt-0 flex items-center gap-2 font-semibold text-2xl tabular-nums">
                  {formatMetricValue(metric.value, metric.isCurrency)}
                  <span
                    className={cn(
                      "font-medium text-sm",
                      metric.change >= 0 ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {formatChange(metric.change)}
                  </span>
                </CardTitle>
                <div className="text-muted-foreground text-sm">
                  {metric.isCurrency
                    ? formatCurrency(metric.previousValue)
                    : new Intl.NumberFormat("es-AR").format(
                        Math.round(metric.previousValue),
                      )}{" "}
                  el período anterior
                </div>
              </CardHeader>
              <CardContent>
                <SalesChart
                  data={reportData.chartData[metric.id] || []}
                  chartId={`chart-mobile-${metric.id}`}
                  metricId={metric.id}
                />
              </CardContent>
            </Card>
          ))}
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
              <SalesBySellerChart data={reportData.bySeller} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Punto de Venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByPosChart data={reportData.byPos} />
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
              <SalesByPaymentChart data={reportData.byPayment} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug font-medium">
                Ventas por Tipo de Comprobante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SalesByReceiptChart data={reportData.byReceipt} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
