"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SalesChart } from "./sales-chart";

const metrics = [
  {
    id: "total-vendido",
    label: "Total Vendido",
    value: "$ 14.245",
    change: "+100.0%",
    previousValue: "$ 0",
  },
  {
    id: "cantidad-ventas",
    label: "Cantidad de Ventas",
    value: "56",
    change: "+100.0%",
    previousValue: "0",
  },
  {
    id: "promedio-venta",
    label: "Promedio por Venta",
    value: "$ 254",
    change: "+100.0%",
    previousValue: "$ 0",
  },
  {
    id: "unidades-vendidas",
    label: "Unidades Vendidas",
    value: "145",
    change: "+100.0%",
    previousValue: "0",
  },
  {
    id: "margen-bruto",
    label: "Margen Bruto",
    value: "$ 11.894",
    change: "+100.0%",
    previousValue: "$ 0",
  },
];

export function SalesMetricsTabs() {
  const [activeTab, setActiveTab] = useState("margen-bruto");

  return (
    <Card className="flex flex-col py-4 sm:py-0">
      <CardHeader className="!p-0 flex flex-col items-stretch border-b sm:flex-row">
        <div className="flex w-full">
          {metrics.map((metric, index) => (
            <button
              key={metric.id}
              onClick={() => setActiveTab(metric.id)}
              className={cn(
                "flex min-w-0 flex-1 flex-col justify-center gap-1 border-t border-b-3 border-l px-2 py-4 text-left first:border-l-0 sm:border-t-0 sm:px-4 sm:py-6",
                activeTab === metric.id
                  ? "border-b-primary"
                  : "border-b-transparent",
              )}
              type="button"
            >
              <span className="truncate text-muted-foreground text-xs">
                {metric.label}
              </span>
              <span className="truncate font-bold text-lg leading-none sm:text-2xl">
                {metric.value}
              </span>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span className="font-medium text-sm text-green-600">
                  {metric.change}
                </span>
                <span className="truncate">{metric.previousValue}</span>
              </div>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <SalesChart chartId="chart-desktop-main" />
      </CardContent>
    </Card>
  );
}
