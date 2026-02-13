import { RecibirTransferenciaClient } from "@/components/transferencias/recibir-transferencia-client";
import { requirePermission } from "@/lib/auth/check-permission";
import { getTransferById } from "@/lib/services/transfers";
import { notFound } from "next/navigation";

interface RecibirTransferenciaPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecibirTransferenciaPage({
  params,
}: RecibirTransferenciaPageProps) {
  await requirePermission("inventory:write");
  const { id } = await params;

  try {
    const transfer = await getTransferById(id);

    if (transfer.status !== "in_transit") {
      notFound();
    }

    return <RecibirTransferenciaClient transfer={transfer} />;
  } catch {
    notFound();
  }
}
