"use client";

import { PurchaseForm } from "@/components/compras/purchase-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getPurchaseById, type Purchase } from "@/lib/services/purchases";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function NuevaCompraPage() {
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("duplicateFrom");

  const [duplicateData, setDuplicateData] = useState<Purchase | undefined>();
  const [isLoading, setIsLoading] = useState(!!duplicateFromId);

  useEffect(() => {
    async function loadDuplicateData() {
      if (duplicateFromId) {
        try {
          const purchase = await getPurchaseById(duplicateFromId);
          if (purchase) {
            setDuplicateData(purchase);
          }
        } catch (error) {
          console.error("Error loading purchase to duplicate:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadDuplicateData();
  }, [duplicateFromId]);

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

  return <PurchaseForm mode="create" duplicateFrom={duplicateData} />;
}
