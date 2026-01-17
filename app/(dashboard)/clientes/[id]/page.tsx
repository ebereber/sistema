"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  ShoppingCart,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { CustomerDialog } from "@/components/clientes/customer-dialog";

import {
  getCustomerById,
  getCustomerRecentSales,
  getCustomerStats,
  type Customer,
} from "@/lib/services/customers";

interface Sale {
  id: string;
  sale_number: string;
  created_at: string;
  total: number;
}

export default function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    pendingBalance: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  async function loadCustomer() {
    setIsLoading(true);
    try {
      const [customerData, statsData, salesData] = await Promise.all([
        getCustomerById(id),
        getCustomerStats(id),
        getCustomerRecentSales(id),
      ]);
      setCustomer(customerData);
      setStats(statsData);
      setRecentSales(salesData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar el cliente", { description: errorMessage });
      router.push("/clientes");
    } finally {
      setIsLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
  }

  function formatDate(date: string): string {
    return format(new Date(date), "d MMM yyyy, HH:mm", { locale: es });
  }

  function formatShortDate(date: string): string {
    return format(new Date(date), "d MMM", { locale: es });
  }

  function getGoogleMapsUrl(): string {
    if (!customer) return "#";
    const address = [
      customer.street_address,
      customer.city,
      customer.province,
      "Argentina",
    ]
      .filter(Boolean)
      .join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  function getWhatsAppUrl(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/54${cleanPhone}`;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6 ">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/clientes"
          className="hover:text-foreground flex gap-2 items-center transition-colors"
        >
          Clientes
          <ChevronRight className="h-4 w-4" />
        </Link>

        {/*  <span className="text-foreground font-medium">{customer.name}</span> */}
      </nav>
      <h1 className="text-3xl font-bold">{customer.name}</h1>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        {/* Left Column - Stats & Sales */}
        <div className="space-y-6">
          {/* 3 Metric Cards in a row */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Card 1: Pedidos */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{stats.totalOrders}</p>
              </CardContent>
            </Card>

            {/* Card 2: Ventas totales */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Ventas totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {formatCurrency(stats.totalSales)}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Saldo pendiente */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-medium">
                  Saldo pendiente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {formatCurrency(stats.pendingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">
                Ventas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Este cliente no tiene ventas registradas
                  </p>
                  <Button asChild variant="outline">
                    <Link href={`/ventas/nueva?customerId=${customer.id}`}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Crear primera venta
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSales.map((sale) => (
                    <Link
                      key={sale.id}
                      href={`/ventas/${sale.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <span className="font-medium text-sm">
                        {sale.sale_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatShortDate(sale.created_at)}
                      </span>
                      <span className="font-medium text-sm">
                        {formatCurrency(sale.total)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer Info */}
        <Card className="h-fit ">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Cliente</CardTitle>
            </div>
            <CustomerDialog
              mode="edit"
              customerId={customer.id}
              onSuccess={loadCustomer}
              trigger={
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name & Document */}
            <div>
              <h3 className="text-xl font-semibold">{customer.name}</h3>
              {customer.tax_id && (
                <p className="text-muted-foreground">
                  {customer.tax_id_type || "DOC"} {customer.tax_id}
                </p>
              )}
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </a>
              )}
              {customer.phone && (
                <a
                  href={getWhatsAppUrl(customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {customer.phone}
                </a>
              )}
            </div>

            {/* Address */}
            {customer.street_address && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Domicilio
                  </p>
                  <p className="text-sm">
                    {customer.street_address}
                    {customer.apartment && `, ${customer.apartment}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {customer.city}
                    {customer.province && `, ${customer.province}`}
                    {customer.postal_code && ` - CP: ${customer.postal_code}`}
                  </p>
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Buscar en Google Maps
                  </a>
                </div>
              </>
            )}

            {/* Commercial Info */}
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Información Comercial
              </p>
              {customer.trade_name && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Nombre comercial
                  </p>
                  <p className="text-sm">{customer.trade_name}</p>
                </div>
              )}
              {customer.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="text-sm">{customer.notes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  Vendedor asignado
                </p>
                <p className="text-sm">
                  {customer.assigned_seller?.name || "Sin asignar"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Lista de precios
                </p>
                <p className="text-sm">Sin asignar</p>
              </div>
              {customer.payment_terms && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Condición de pago
                  </p>
                  <p className="text-sm">{customer.payment_terms}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Cliente desde</span>
              </div>
              <p className="text-sm">{formatDate(customer.created_at)}</p>

              {customer.updated_at &&
                customer.updated_at !== customer.created_at && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground mt-3">
                      <Pencil className="h-4 w-4" />
                      <span>Última modificación</span>
                    </div>
                    <p className="text-sm">{formatDate(customer.updated_at)}</p>
                  </>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
