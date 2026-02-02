"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const chartData = [
  { date: "Ene 3", current: 0, previous: 0 },
  { date: "Ene 6", current: 0, previous: 0 },
  { date: "Ene 9", current: 0, previous: 0 },
  { date: "Ene 13", current: 0, previous: 0 },
  { date: "Ene 17", current: 0, previous: 0 },
  { date: "Ene 21", current: 0, previous: 0 },
  { date: "Ene 25", current: 0, previous: 0 },
  { date: "Ene 29", current: 2000, previous: 0 },
  { date: "Feb 1", current: 1500, previous: 0 },
  { date: "Feb 2", current: 6500, previous: 0 },
];

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

interface SalesChartProps {
  chartId: string;
}

export function SalesChart({ chartId }: SalesChartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full"
    >
      <LineChart data={chartData}>
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
          tickFormatter={(value) => {
            if (value >= 1000) {
              return `${value / 1000}K`;
            }
            return value.toString();
          }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
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
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
