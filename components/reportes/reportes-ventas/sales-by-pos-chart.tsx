"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const chartData = [
  { pos: "Ejemplo", totalSales: 14000 },
  { pos: "Central", totalSales: 4500 },
];

const chartConfig = {
  totalSales: {
    label: "Ventas Totales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function SalesByPosChart() {
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
            if (value >= 1000) {
              return `$${value / 1000}K`;
            }
            return `$${value}`;
          }}
        />
        <YAxis
          type="category"
          dataKey="pos"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
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
