"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartData = [
  { receiptType: "Comprobantes X", totalSales: 16000 },
  { receiptType: "Notas de Crédito X", totalSales: -2000 },
];

const chartConfig = {
  totalSales: {
    label: "Ventas Totales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function SalesByReceiptChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart
        data={chartData}
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
          tickFormatter={(value) => {
            const absValue = Math.abs(value);
            const sign = value < 0 ? "-" : "";
            if (absValue >= 1000) {
              return `${sign}$${absValue / 1000}K`;
            }
            return `${sign}$${absValue}`;
          }}
        />
        <YAxis
          type="category"
          dataKey="receiptType"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          width={100}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="totalSales"
          fill="var(--color-totalSales)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
