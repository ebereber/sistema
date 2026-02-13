import { Suspense } from "react"
import { redirect } from "next/navigation"

import { Loader2 } from "lucide-react"

import { requirePermission } from "@/lib/auth/check-permission"
import { getOrganizationId } from "@/lib/auth/get-organization"
import { getServerUser } from "@/lib/auth/get-server-user"
import { getCachedPaymentMethods } from "@/lib/services/payment-methods-cached"
import { getCachedActiveBankAccounts } from "@/lib/services/bank-accounts-cached"
import { MediosDePagoPageClient } from "@/components/configuracion/medios-de-pago-page-client"

export default async function MediosDePagoPage() {
  await requirePermission("settings:write")
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MediosDePagoContent />
    </Suspense>
  )
}

async function MediosDePagoContent() {
  const user = await getServerUser()
  if (!user) redirect("/login")
  const organizationId = await getOrganizationId()

  const [paymentMethods, bankAccounts] = await Promise.all([
    getCachedPaymentMethods(organizationId),
    getCachedActiveBankAccounts(organizationId),
  ])

  return <MediosDePagoPageClient initialPaymentMethods={paymentMethods} bankAccounts={bankAccounts} />
}

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
