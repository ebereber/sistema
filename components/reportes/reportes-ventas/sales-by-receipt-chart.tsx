"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartConfig = {
  totalSales: {
    label: "Ventas Totales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function formatCurrencyShort(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}$${absValue}`;
}

interface SalesByReceiptChartProps {
  data: { receiptType: string; totalSales: number }[];
}

export function SalesByReceiptChart({ data }: SalesByReceiptChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 20 }}
      >
        <CartesianGrid strokeDasharray="0" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          tickFormatter={formatCurrencyShort}
        />
        <YAxis
          type="category"
          dataKey="receiptType"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          width={120}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                }).format(value as number)
              }
            />
          }
        />
        <Bar
          dataKey="totalSales"
          fill="var(--color-totalSales)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
