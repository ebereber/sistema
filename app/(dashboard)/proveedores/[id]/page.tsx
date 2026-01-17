"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ShoppingCart,
  DollarSign,
  User,
  Pencil,
  Mail,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { use } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import { SupplierDialog } from "@/components/proveedores/supplier-dialog"

import {
  getSupplierById,
  getSupplierStats,
  getSupplierRecentPurchases,
  type Supplier,
} from "@/lib/services/suppliers"

interface Purchase {
  id: string
  purchase_number: string
  created_at: string
  total: number
}

export default function ProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [stats, setStats] = useState({ totalPurchases: 0, totalAmount: 0 })
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSupplier()
  }, [id])

  async function loadSupplier() {
    setIsLoading(true)
    try {
      const [supplierData, statsData, purchasesData] = await Promise.all([
        getSupplierById(id),
        getSupplierStats(id),
        getSupplierRecentPurchases(id),
      ])
      setSupplier(supplierData)
      setStats(statsData)
      setRecentPurchases(purchasesData)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error("Error al cargar el proveedor", { description: errorMessage })
      router.push("/proveedores")
    } finally {
      setIsLoading(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  function formatDate(date: string): string {
    return format(new Date(date), "d MMM yyyy, HH:mm", { locale: es })
  }

  function formatShortDate(date: string): string {
    return format(new Date(date), "d MMM", { locale: es })
  }

  function getGoogleMapsUrl(): string {
    if (!supplier) return "#"
    const address = [
      supplier.street_address,
      supplier.city,
      supplier.province,
      "Argentina",
    ]
      .filter(Boolean)
      .join(", ")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  function getWhatsAppUrl(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "")
    return `https://wa.me/54${cleanPhone}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!supplier) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/proveedores" className="hover:text-foreground transition-colors">
          Proveedores
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{supplier.name}</span>
      </nav>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column - Stats & Purchases */}
        <div className="space-y-6">
          {/* Purchases Count Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Compras</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalPurchases}</p>
            </CardContent>
          </Card>

          {/* Total Amount Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Monto Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{formatCurrency(stats.totalAmount)}</p>
            </CardContent>
          </Card>

          {/* Recent Purchases Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Compras Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    No hay compras registradas
                  </p>
                  <Button asChild variant="outline">
                    <Link href={`/compras/nueva?proveedor=${supplier.id}`}>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Crear primera compra
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPurchases.map((purchase) => (
                    <Link
                      key={purchase.id}
                      href={`/compras/${purchase.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <span className="font-medium text-sm">
                        {purchase.purchase_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatShortDate(purchase.created_at)}
                      </span>
                      <span className="font-medium text-sm">
                        {formatCurrency(purchase.total)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Supplier Info */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-medium">Proveedor</CardTitle>
            </div>
            <SupplierDialog
              mode="edit"
              supplierId={supplier.id}
              onSuccess={loadSupplier}
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
              <h3 className="text-xl font-semibold">{supplier.name}</h3>
              {supplier.tax_id && (
                <p className="text-muted-foreground">
                  {supplier.tax_id_type || "DOC"} {supplier.tax_id}
                </p>
              )}
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              {supplier.email && (
                <a
                  href={`mailto:${supplier.email}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {supplier.email}
                </a>
              )}
              {supplier.phone && (
                <a
                  href={getWhatsAppUrl(supplier.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  {supplier.phone}
                </a>
              )}
            </div>

            {/* Address */}
            {supplier.street_address && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Domicilio</p>
                  <p className="text-sm">
                    {supplier.street_address}
                    {supplier.apartment && `, ${supplier.apartment}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {supplier.city}
                    {supplier.province && `, ${supplier.province}`}
                    {supplier.postal_code && ` - CP: ${supplier.postal_code}`}
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
            {(supplier.trade_name || supplier.business_description || supplier.payment_terms) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {supplier.trade_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Nombre comercial
                      </p>
                      <p className="text-sm">{supplier.trade_name}</p>
                    </div>
                  )}
                  {supplier.business_description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Descripción
                      </p>
                      <p className="text-sm">{supplier.business_description}</p>
                    </div>
                  )}
                  {supplier.payment_terms && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Condición de pago
                      </p>
                      <p className="text-sm">{supplier.payment_terms}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Proveedor desde</span>
              </div>
              <p className="text-sm">{formatDate(supplier.created_at)}</p>

              {supplier.updated_at && supplier.updated_at !== supplier.created_at && (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground mt-3">
                    <Pencil className="h-4 w-4" />
                    <span>Última modificación</span>
                  </div>
                  <p className="text-sm">{formatDate(supplier.updated_at)}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
