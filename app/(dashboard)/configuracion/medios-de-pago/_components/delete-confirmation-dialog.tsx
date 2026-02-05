'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePaymentMethodAction } from '@/lib/actions/payment-methods'
import type { PaymentMethod } from '@/types/payment-method'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentMethod: PaymentMethod
  onSuccess: () => void
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  paymentMethod,
  onSuccess,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deletePaymentMethodAction(paymentMethod.id)
      toast.success('Medio de pago eliminado')
      onOpenChange(false)
      onSuccess()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar medio de pago?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El medio de pago &quot;{paymentMethod.name}&quot; será eliminado permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
