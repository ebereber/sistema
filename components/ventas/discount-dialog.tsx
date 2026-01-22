"use client"

import { useState, useEffect } from "react"
import { Percent, DollarSign, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  formatPrice,
  type DiscountType,
  type ItemDiscount,
  type GlobalDiscount,
  type CartItem,
} from "@/lib/validations/sale"

interface ItemDiscountDialogProps {
  mode: "item"
  open: boolean
  onOpenChange: (open: boolean) => void
  item: CartItem
  onApply: (discount: ItemDiscount | null) => void
}

interface GlobalDiscountDialogProps {
  mode: "global"
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  currentDiscount: GlobalDiscount | null
  onApply: (discount: GlobalDiscount | null) => void
}

type DiscountDialogProps = ItemDiscountDialogProps | GlobalDiscountDialogProps

export function DiscountDialog(props: DiscountDialogProps) {
  const { mode, open, onOpenChange, onApply } = props

  const [discountType, setDiscountType] = useState<DiscountType>("percentage")
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Initialize with existing discount when opening
  useEffect(() => {
    if (open) {
      if (mode === "item") {
        const item = (props as ItemDiscountDialogProps).item
        if (item.discount) {
          setDiscountType(item.discount.type)
          setValue(item.discount.value.toString())
        } else {
          setDiscountType("percentage")
          setValue("")
        }
      } else {
        const currentDiscount = (props as GlobalDiscountDialogProps).currentDiscount
        if (currentDiscount) {
          setDiscountType(currentDiscount.type)
          setValue(currentDiscount.value.toString())
        } else {
          setDiscountType("percentage")
          setValue("")
        }
      }
      setError(null)
    }
  }, [open, mode, props])

  const calculatePreview = (): { original: number; discounted: number; saved: number } => {
    const numValue = parseFloat(value) || 0

    if (mode === "item") {
      const item = (props as ItemDiscountDialogProps).item
      const original = item.price * item.quantity
      let saved = 0

      if (discountType === "percentage") {
        saved = original * (numValue / 100)
      } else {
        saved = Math.min(numValue * item.quantity, original)
      }

      return {
        original,
        discounted: original - saved,
        saved,
      }
    } else {
      const subtotal = (props as GlobalDiscountDialogProps).subtotal
      let saved = 0

      if (discountType === "percentage") {
        saved = subtotal * (numValue / 100)
      } else {
        saved = Math.min(numValue, subtotal)
      }

      return {
        original: subtotal,
        discounted: subtotal - saved,
        saved,
      }
    }
  }

  const validateAndApply = () => {
    const numValue = parseFloat(value)

    if (isNaN(numValue) || numValue < 0) {
      setError("Ingresa un valor válido")
      return
    }

    if (discountType === "percentage" && numValue > 100) {
      setError("El porcentaje no puede ser mayor a 100%")
      return
    }

    const preview = calculatePreview()
    if (preview.saved > preview.original) {
      setError("El descuento no puede ser mayor al total")
      return
    }

    if (numValue === 0) {
      onApply(null)
    } else {
      onApply({ type: discountType, value: numValue })
    }
    onOpenChange(false)
  }

  const handleRemoveDiscount = () => {
    onApply(null)
    onOpenChange(false)
  }

  const preview = calculatePreview()
  const hasExistingDiscount =
    mode === "item"
      ? !!(props as ItemDiscountDialogProps).item.discount
      : !!(props as GlobalDiscountDialogProps).currentDiscount

  const title =
    mode === "item"
      ? `Descuento: ${(props as ItemDiscountDialogProps).item.name}`
      : "Descuento general"

  const description =
    mode === "item"
      ? "Aplica un descuento a este producto"
      : "Aplica un descuento al total de la venta"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Discount type selector */}
          <div className="space-y-2">
            <Label>Tipo de descuento</Label>
            <Tabs
              value={discountType}
              onValueChange={(v) => setDiscountType(v as DiscountType)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="percentage" className="gap-2">
                  <Percent className="h-4 w-4" />
                  Porcentaje
                </TabsTrigger>
                <TabsTrigger value="fixed" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto fijo
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Value input */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Porcentaje (%)" : "Monto ($)"}
            </Label>
            <div className="relative">
              <Input
                id="discount-value"
                type="number"
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                step="0.01"
                placeholder={discountType === "percentage" ? "10" : "100"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError(null)
                }}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {discountType === "percentage" ? "%" : "$"}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parseFloat(value) > 0 && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {mode === "item" ? "Subtotal" : "Total actual"}
                </span>
                <span>{formatPrice(preview.original)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-{formatPrice(preview.saved)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                <span>Nuevo total</span>
                <span>{formatPrice(preview.discounted)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {hasExistingDiscount && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveDiscount}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Quitar descuento
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={validateAndApply}>
              Aplicar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
