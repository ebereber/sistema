"use client"

import { useState, useEffect } from "react"
import { Search, User, Loader2, UserPlus, Check } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useDebounce } from "@/hooks/use-debounce"
import { getCustomers, type Customer } from "@/lib/services/customers"
import { DEFAULT_CUSTOMER, type SelectedCustomer } from "@/lib/validations/sale"
import { getCustomerPriceListAdjustment } from "@/lib/services/sales"

interface CustomerSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCustomer: SelectedCustomer
  onCustomerSelect: (customer: SelectedCustomer) => void
}

export function CustomerSelectDialog({
  open,
  onOpenChange,
  selectedCustomer,
  onCustomerSelect,
}: CustomerSelectDialogProps) {
  const [search, setSearch] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  // Load customers when dialog opens or search changes
  useEffect(() => {
    if (!open) return

    async function loadCustomers() {
      setIsLoading(true)
      try {
        const data = await getCustomers({
          search: debouncedSearch || undefined,
          active: true,
        })
        setCustomers(data)
      } catch (error) {
        console.error("Error loading customers:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCustomers()
  }, [open, debouncedSearch])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  const handleSelectConsumidorFinal = () => {
    onCustomerSelect(DEFAULT_CUSTOMER)
    onOpenChange(false)
  }

  const handleSelectCustomer = async (customer: Customer) => {
    // Get price list adjustment if customer has one
    let priceListAdjustment = null
    let priceListAdjustmentType = null
    let priceListId = customer.price_list_id

    if (priceListId) {
      try {
        const adjustment = await getCustomerPriceListAdjustment(customer.id)
        if (adjustment) {
          priceListAdjustment = adjustment.adjustmentPercentage
          priceListAdjustmentType = adjustment.adjustmentType
        }
      } catch (error) {
        console.error("Error getting price list adjustment:", error)
      }
    }

    onCustomerSelect({
      id: customer.id,
      name: customer.name,
      taxId: customer.tax_id,
      taxCategory: customer.tax_category,
      priceListId,
      priceListAdjustment,
      priceListAdjustmentType,
    })
    onOpenChange(false)
  }

  const isConsumidorFinalSelected = selectedCustomer.id === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Seleccionar cliente</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Consumidor Final option */}
          <button
            type="button"
            onClick={handleSelectConsumidorFinal}
            className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Consumidor Final</p>
              <p className="text-sm text-muted-foreground">Sin datos de cliente</p>
            </div>
            {isConsumidorFinalSelected && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre o CUIT/CUIL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Customer list */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "No se encontraron clientes"
                    : "No hay clientes registrados"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {customers.map((customer) => {
                  const isSelected = selectedCustomer.id === customer.id
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{customer.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {customer.tax_id && <span>{customer.tax_id}</span>}
                          {customer.tax_category && (
                            <>
                              {customer.tax_id && <span>-</span>}
                              <span>{customer.tax_category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Create new customer button */}
          <Button variant="outline" className="w-full" disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            Crear nuevo cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
