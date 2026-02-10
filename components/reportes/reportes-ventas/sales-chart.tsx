"use client";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartConfig = {
  current: {
    label: "Período actual",
    color: "hsl(var(--chart-1))",
  },
  previous: {
    label: "Período anterior",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

const CURRENCY_METRICS = new Set([
  "total-vendido",
  "promedio-venta",
  "margen-bruto",
]);

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

function formatNumberShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${value}`;
}

interface SalesChartProps {
  chartId: string;
  data: { date: string; current: number; previous: number }[];
  metricId?: string;
}

export function SalesChart({ chartId, data, metricId }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full"
    >
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          tickFormatter={
            metricId && !CURRENCY_METRICS.has(metricId)
              ? formatNumberShort
              : formatCurrencyShort
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                metricId && !CURRENCY_METRICS.has(metricId)
                  ? new Intl.NumberFormat("es-AR").format(
                      Math.round(value as number),
                    )
                  : new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      maximumFractionDigits: 0,
                    }).format(value as number)
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="previous"
          stroke="var(--color-previous)"
          strokeWidth={2}
          strokeDasharray="3 3"
          strokeOpacity={0.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="current"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
