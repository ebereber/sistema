"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { getSellers, type Seller } from "@/lib/services/customers"
import { PAYMENT_TERMS, type CommercialInfoData } from "@/lib/validations/customer"

interface CommercialInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: CommercialInfoData
  onSave: (data: CommercialInfoData) => void
}

export function CommercialInfoDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
}: CommercialInfoDialogProps) {
  const [tradeName, setTradeName] = useState(defaultValues?.trade_name || "")
  const [notes, setNotes] = useState(defaultValues?.notes || "")
  const [assignedSellerId, setAssignedSellerId] = useState<string | null>(
    defaultValues?.assigned_seller_id || null
  )
  const [paymentTerms, setPaymentTerms] = useState(defaultValues?.payment_terms || "")

  const [sellers, setSellers] = useState<Seller[]>([])
  const [isLoadingSellers, setIsLoadingSellers] = useState(false)
  const [sellerComboboxOpen, setSellerComboboxOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setTradeName(defaultValues?.trade_name || "")
      setNotes(defaultValues?.notes || "")
      setAssignedSellerId(defaultValues?.assigned_seller_id || null)
      setPaymentTerms(defaultValues?.payment_terms || "")
      loadSellers()
    }
  }, [open, defaultValues])

  async function loadSellers() {
    setIsLoadingSellers(true)
    try {
      const data = await getSellers()
      setSellers(data)
    } catch {
      setSellers([])
    } finally {
      setIsLoadingSellers(false)
    }
  }

  function handleSave() {
    onSave({
      trade_name: tradeName || null,
      notes: notes || null,
      assigned_seller_id: assignedSellerId,
      price_list_id: null, // Siempre null por ahora
      payment_terms: paymentTerms || null,
    })
    onOpenChange(false)
  }

  const selectedSeller = sellers.find((s) => s.id === assignedSellerId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Información Comercial</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nombre Comercial */}
          <div className="grid gap-2">
            <Label htmlFor="trade_name">Nombre Comercial</Label>
            <Input
              id="trade_name"
              placeholder="Ej: La Tienda de Ana"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
            />
          </div>

          {/* Descripción / Notas */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Descripción</Label>
            <Textarea
              id="notes"
              placeholder="Ej: Cliente frecuente, preferencia por productos premium..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Vendedor Asignado - Combobox */}
          <div className="grid gap-2">
            <Label>Vendedor Asignado</Label>
            <Popover open={sellerComboboxOpen} onOpenChange={setSellerComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={sellerComboboxOpen}
                  className="justify-between"
                  disabled={isLoadingSellers}
                >
                  {isLoadingSellers ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando...
                    </>
                  ) : selectedSeller ? (
                    selectedSeller.name
                  ) : (
                    "Seleccioná un vendedor..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar vendedor..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron vendedores.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setAssignedSellerId(null)
                          setSellerComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            !assignedSellerId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Sin vendedor asignado
                      </CommandItem>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.name}
                          onSelect={() => {
                            setAssignedSellerId(seller.id)
                            setSellerComboboxOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              assignedSellerId === seller.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {seller.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Lista de Precios - DISABLED */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Lista de Precios</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select disabled>
                      <SelectTrigger className="opacity-50">
                        <SelectValue placeholder="Disponible próximamente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Esta función estará disponible cuando se cree el módulo de listas de precios</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Condición de Pago */}
          <div className="grid gap-2">
            <Label htmlFor="payment_terms">Condición de Pago</Label>
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
              <SelectTrigger id="payment_terms">
                <SelectValue placeholder="Seleccioná una condición de pago..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
