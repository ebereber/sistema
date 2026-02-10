"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ChartDataByMetric } from "@/lib/actions/reports";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SalesChart } from "./sales-chart";

interface MetricTab {
  id: string;
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  previousValue: string;
}

interface SalesMetricsTabsProps {
  metrics: MetricTab[];
  chartData: ChartDataByMetric;
}

export function SalesMetricsTabs({
  metrics,
  chartData,
}: SalesMetricsTabsProps) {
  const [activeTab, setActiveTab] = useState(
    metrics[metrics.length - 1]?.id || "",
  );
  console.log(activeTab, JSON.stringify(chartData[activeTab]?.slice(0, 3)));
  return (
    <Card className="flex flex-col py-4 sm:py-0">
      <CardHeader className="!p-0 flex flex-col items-stretch border-b sm:flex-row">
        <div className="flex w-full">
          {metrics.map((metric) => (
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
                <span
                  className={cn(
                    "font-medium text-sm",
                    metric.changePositive ? "text-green-600" : "text-red-600",
                  )}
                >
                  {metric.change}
                </span>
                <span className="truncate">{metric.previousValue}</span>
              </div>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <SalesChart
          key={activeTab}
          chartId="chart-desktop-main"
          data={chartData[activeTab] || []}
          metricId={activeTab}
        />
      </CardContent>
    </Card>
  );
}
