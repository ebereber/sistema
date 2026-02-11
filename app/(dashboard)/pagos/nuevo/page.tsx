import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

import { getOrganizationId } from "@/lib/auth/get-organization";
import { getServerUser } from "@/lib/auth/get-server-user";
import { getCachedPaymentMethods } from "@/lib/services/payment-methods-cached";
import { getCachedActiveBankAccounts } from "@/lib/services/bank-accounts-cached";
import { getCachedSuppliers } from "@/lib/services/suppliers-cached";
import { NuevoPagoForm } from "@/components/pagos/nuevo-pago-form";

export default function NuevoPagoPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <NuevoPagoContent />
    </Suspense>
  );
}

async function NuevoPagoContent() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const organizationId = await getOrganizationId();

  const [allPaymentMethods, bankAccounts, suppliers] = await Promise.all([
    getCachedPaymentMethods(organizationId),
    getCachedActiveBankAccounts(organizationId),
    getCachedSuppliers(organizationId),
  ]);

  // Filter payment methods for COMPRAS or VENTAS_Y_COMPRAS
  const paymentMethods = allPaymentMethods.filter(
    (pm) =>
      pm.is_active &&
      (pm.availability === "COMPRAS" || pm.availability === "VENTAS_Y_COMPRAS"),
  );

  return (
    <NuevoPagoForm
      paymentMethods={paymentMethods.map((pm) => ({
        id: pm.id,
        name: pm.name,
        type: pm.type,
        requires_reference: pm.requires_reference,
        bank_account_id: pm.bank_account_id ?? null,
      }))}
      bankAccounts={bankAccounts}
      initialSuppliers={suppliers.filter((s) => s.active)}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
