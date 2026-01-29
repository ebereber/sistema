"use client";

import { PurchaseForm } from "@/components/compras/purchase-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getPurchaseById, type Purchase } from "@/lib/services/purchases";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditarCompraPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPurchase() {
      try {
        const data = await getPurchaseById(purchaseId);
        if (data) {
          setPurchase(data);
        } else {
          toast.error("Compra no encontrada");
          router.push("/compras");
        }
      } catch (error) {
        console.error("Error loading purchase:", error);
        toast.error("Error al cargar la compra");
        router.push("/compras");
      } finally {
        setIsLoading(false);
      }
    }
    loadPurchase();
  }, [purchaseId, router]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!purchase) return null;

  return <PurchaseForm mode="edit" initialData={purchase} />;
}
