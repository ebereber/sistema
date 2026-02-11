"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PaymentMethod, PaymentMethodType } from "@/types/payment-method"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { PaymentMethodSheet } from "@/app/(dashboard)/configuracion/medios-de-pago/_components/payment-method-sheet"
import { PaymentMethodsTable } from "@/app/(dashboard)/configuracion/medios-de-pago/_components/payment-methods-table"

interface MediosDePagoPageClientProps {
  initialPaymentMethods: PaymentMethod[]
  bankAccounts: Array<{ id: string; bank_name: string; account_name: string }>
}

export function MediosDePagoPageClient({
  initialPaymentMethods,
  bankAccounts,
}: MediosDePagoPageClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(
    null
  )
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<"type-selector" | "form">(
    "type-selector"
  )

  // Client-side filtering
  const filteredMethods = search.trim()
    ? initialPaymentMethods.filter((pm) =>
        pm.name.toLowerCase().includes(search.toLowerCase())
      )
    : initialPaymentMethods

  function handleOpenSheet() {
    setEditingMethod(null)
    setCurrentStep("type-selector")
    setSelectedType(null)
    setSheetOpen(true)
  }

  function handleEdit(method: PaymentMethod) {
    setEditingMethod(method)
    setSelectedType(method.type)
    setCurrentStep("form")
    setSheetOpen(true)
  }

  function handleCloseSheet(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setTimeout(() => {
        setCurrentStep("type-selector")
        setSelectedType(null)
        setEditingMethod(null)
      }, 300)
    }
  }

  function handleTypeSelect(type: PaymentMethodType) {
    setSelectedType(type)
    setCurrentStep("form")
  }

  function handleBack() {
    setCurrentStep("type-selector")
    setSelectedType(null)
  }

  return (
    <div className="space-y-6">
      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4 md:flex-row flex-col">
        <div className="relative flex-1 md:max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-fit">
          <Button onClick={handleOpenSheet} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:inline">Agregar Medio de Pago</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <PaymentMethodsTable
        paymentMethods={filteredMethods}
        isLoading={false}
        onRefresh={() => router.refresh()}
        onEdit={handleEdit}
      />

      <PaymentMethodSheet
        open={sheetOpen}
        onOpenChange={handleCloseSheet}
        currentStep={currentStep}
        paymentMethod={editingMethod ?? undefined}
        bankAccounts={bankAccounts}
        selectedType={selectedType}
        onTypeSelect={handleTypeSelect}
        onBack={handleBack}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
