import { TransferenciaDetalleClient } from "@/components/transferencias/transferencia-detalle-client";
import { getTransferById } from "@/lib/services/transfers";
import { notFound } from "next/navigation";

interface TransferenciaDetailPageProps {
  params: Promise<{ id: string }>;
}
export default async function TransferenciaDetailPage({
  params,
}: TransferenciaDetailPageProps) {
  const { id } = await params;

  let transfer;
  try {
    transfer = await getTransferById(id);
  } catch {
    notFound();
  }

  return <TransferenciaDetalleClient transfer={transfer} />;
}
