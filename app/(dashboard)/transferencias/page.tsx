import { TransferenciasClient } from "@/components/transferencias/transferencias-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getTransfers } from "@/lib/services/transfers";

interface TransferenciasPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    search?: string;
  }>;
}

export default async function TransferenciasPage({
  searchParams,
}: TransferenciasPageProps) {
  await requirePermission("inventory:write");
  const params = await searchParams;
  const statusFilter = params.status ? params.status.split(",") : undefined;
  const page = params.page ? parseInt(params.page) : 1;

  const result = await getTransfers({
    search: params.search,
    status: statusFilter,
    page,
    pageSize: 20,
  });

  return <TransferenciasClient data={result} />;
}
