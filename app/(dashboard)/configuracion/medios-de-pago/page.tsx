'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { PaymentMethodsTable } from './_components/payment-methods-table'
import { TypeSelectorDialog } from './_components/type-selector-dialog'
import { PaymentMethodFormDialog } from './_components/payment-method-form-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { getPaymentMethods } from '@/lib/services/payment-methods'
import type { PaymentMethod, PaymentMethodType } from '@/types/payment-method'
import { toast } from 'sonner'

export default function MediosDePagoPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(null)
  const [formDialogOpen, setFormDialogOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const loadPaymentMethods = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getPaymentMethods({
        search: debouncedSearch || undefined,
      })
      setPaymentMethods(data)
    } catch {
      toast.error('Error al cargar medios de pago')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    loadPaymentMethods()
  }, [loadPaymentMethods])

  // Handle type selection (Paso 1 → Paso 2)
  function handleTypeSelect(type: PaymentMethodType) {
    setSelectedType(type)
    setTypeSelectorOpen(false)
    setFormDialogOpen(true)
  }

  // Handle back from form to type selector
  function handleFormBack() {
    setFormDialogOpen(false)
    setSelectedType(null)
    setTypeSelectorOpen(true)
  }

  // Keyboard shortcut "N" to open type selector
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setTypeSelectorOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Medios de Pago</h1>
        <p className="text-muted-foreground">
          Configura los medios de pago disponibles para ventas y compras
        </p>
      </div>

      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button onClick={() => setTypeSelectorOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Agregar</span>
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
            N
          </kbd>
        </Button>
      </div>

      {/* Table */}
      <PaymentMethodsTable
        paymentMethods={paymentMethods}
        isLoading={isLoading}
        onRefresh={loadPaymentMethods}
      />

      {/* Type Selector Dialog (Paso 1) */}
      <TypeSelectorDialog
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onTypeSelect={handleTypeSelect}
      />

      {/* Form Dialog (Paso 2) */}
      {selectedType && (
        <PaymentMethodFormDialog
          open={formDialogOpen}
          onOpenChange={(open) => {
            setFormDialogOpen(open)
            if (!open) setSelectedType(null)
          }}
          type={selectedType}
          onSuccess={loadPaymentMethods}
          onBack={handleFormBack}
        />
      )}
    </div>
  )
}
