"use client";

import { PurchaseOrderForm } from "@/components/ordenes/purchase-order-form";
import {
  getPurchaseOrderById,
  type PurchaseOrderWithDetails,
} from "@/lib/services/purchase-orders";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditarOrdenPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPurchaseOrderById(id);

        // Only draft and confirmed orders can be edited
        if (data.status !== "draft" && data.status !== "confirmed") {
          toast.error(
            "Solo se pueden editar órdenes en borrador o confirmadas",
          );
          router.push(`/ordenes/${id}`);
          return;
        }

        setOrder(data);
      } catch {
        toast.error("Orden no encontrada");
        router.push("/ordenes");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  return <PurchaseOrderForm mode="edit" initialData={order} />;
}
