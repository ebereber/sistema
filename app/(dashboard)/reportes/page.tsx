import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartColumn,
  Coins,
  FileText,
  Package,
  Plus,
  Receipt,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

// Tipo para los reportes
interface Report {
  id: string;
  title: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function ReportesPage() {
  // Categorías de reportes
  const categories = [
    {
      title: "Impositivo",
      reports: [
        {
          id: "libro-iva-digital",
          title: "Libro IVA Digital",
          icon: FileText,
          href: "/reportes/libro-iva-digital",
        },
        {
          id: "iva-ventas",
          title: "IVA Ventas",
          icon: FileText,
          href: "/reportes/iva-ventas",
        },
        {
          id: "iva-compras",
          title: "IVA Compras",
          icon: FileText,
          href: "/reportes/iva-compras",
        },
        {
          id: "retenciones-percepciones",
          title: "Retenciones y Percepciones",
          icon: Receipt,
          href: "/reportes/retenciones-percepciones",
        },
      ] as Report[],
    },
    {
      title: "Ventas",
      reports: [
        {
          id: "resumen-ventas",
          title: "Resumen de ventas",
          icon: ChartColumn,
          href: "/reportes/resumen-ventas",
        },
        {
          id: "productos-vendidos",
          title: "Productos más vendidos",
          icon: Trophy,
          href: "/reportes/productos-vendidos",
        },
        {
          id: "mejores-clientes",
          title: "Mejores clientes",
          icon: Users,
          href: "/reportes/mejores-clientes",
        },
        {
          id: "rentabilidad-bruta",
          title: "Rentabilidad bruta",
          icon: Coins,
          href: "/reportes/rentabilidad-bruta",
          disabled: true,
          disabledMessage: "Próximamente disponible",
        },
      ] as Report[],
    },
    {
      title: "Inventario",
      reports: [
        {
          id: "valorizacion-stock",
          title: "Valorización de Stock",
          icon: Package,
          href: "/reportes/valorizacion-stock",
        },
      ] as Report[],
    },
    {
      title: "Financieros",
      reports: [
        {
          id: "cuenta-corriente",
          title: "Cuenta Corriente",
          icon: ChartColumn,
          href: "/reportes/cuenta-corriente",
        },
        {
          id: "cuentas-pagar",
          title: "Cuentas a Pagar",
          icon: FileText,
          href: "/reportes/cuentas-pagar",
        },
        {
          id: "cuentas-cobrar",
          title: "Cuentas a Cobrar",
          icon: FileText,
          href: "/reportes/cuentas-cobrar",
        },
      ] as Report[],
    },
  ];

  return (
    <div className="flex flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
        <Button asChild>
          <Link href="/reportes/nuevo">
            <Plus className="size-4" />
            Nuevo Reporte
          </Link>
        </Button>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {categories.map((category) => (
          <section key={category.title}>
            <h3 className="pb-2 text-lg font-semibold">{category.title}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.reports.map((report) => {
                const Icon = report.icon;
                const content = (
                  <div
                    className={`group/item flex h-auto w-full cursor-pointer items-center justify-start gap-4 rounded-xl border border-border bg-card p-3 text-sm outline-none transition-colors duration-100 hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.99] ${
                      report.disabled ? "cursor-default opacity-50" : ""
                    }`}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted [&_svg:not([class*='size-'])]:size-4">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex w-fit items-center gap-2 text-sm font-medium leading-snug">
                        {report.title}
                      </div>
                    </div>
                  </div>
                );

                if (report.disabled) {
                  return (
                    <TooltipProvider key={report.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full">{content}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{report.disabledMessage}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return (
                  <Link key={report.id} href={report.href}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
