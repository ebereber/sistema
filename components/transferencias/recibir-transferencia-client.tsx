"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { receiveTransferAction } from "@/lib/actions/transfers";

// ─── Types ────────────────────────────────────────────

interface TransferItem {
  id: string;
  product_id: string;
  quantity: number;
  quantity_received: number;
  product: {
    id: string;
    name: string;
    sku: string;
    image_url: string | null;
  };
}

interface Transfer {
  id: string;
  transfer_number: string;
  status: string;
  source_location: { id: string; name: string };
  destination_location: { id: string; name: string };
  items: TransferItem[];
}

// ─── Component ────────────────────────────────────────

interface RecibirTransferenciaClientProps {
  transfer: Transfer;
}

export function RecibirTransferenciaClient({
  transfer,
}: RecibirTransferenciaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize received quantities from current state
  const [receivedQuantities, setReceivedQuantities] = useState<
    Record<string, number>
  >(
    transfer.items.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: item.quantity_received,
      }),
      {},
    ),
  );

  const handleQuantityChange = (itemId: string, value: string) => {
    const item = transfer.items.find((i) => i.id === itemId);
    if (!item) return;
    const numValue = Math.max(
      item.quantity_received, // Can't go below already received
      Math.min(parseInt(value) || 0, item.quantity),
    );
    setReceivedQuantities((prev) => ({ ...prev, [itemId]: numValue }));
  };

  const handleReceiveAll = () => {
    const allReceived = transfer.items.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: item.quantity,
      }),
      {},
    );
    setReceivedQuantities(allReceived);
  };

  const handleSubmit = () => {
    // Only send items that have new receivals
    const itemsToReceive = transfer.items
      .filter(
        (item) => (receivedQuantities[item.id] || 0) > item.quantity_received,
      )
      .map((item) => ({
        itemId: item.id,
        quantityReceived: receivedQuantities[item.id] || 0,
      }));

    if (itemsToReceive.length === 0) {
      toast.error("No hay cambios para confirmar");
      return;
    }

    startTransition(async () => {
      try {
        const result = await receiveTransferAction(transfer.id, itemsToReceive);
        toast.success(
          result.completed
            ? "Transferencia completada"
            : "Recepción parcial registrada",
        );
        router.push(`/transferencias/${transfer.id}`);
      } catch (error) {
        console.error(error);
        toast.error("Error al registrar la recepción");
      }
    });
  };

  const totalProducts = transfer.items.length;
  const totalUnits = transfer.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalReceived = Object.values(receivedQuantities).reduce(
    (sum, qty) => sum + qty,
    0,
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="gap-4">
        <Link
          href={`/transferencias/${transfer.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
        >
          {transfer.transfer_number}
          <ChevronRight className="h-3 w-3" />
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Recibir transferencia</h1>
          <Badge variant="secondary">En tránsito</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Productos a recibir</CardTitle>
                  <CardDescription>
                    Ingresá las cantidades recibidas para cada producto
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReceiveAll}
                  className="h-7 px-2.5 text-xs"
                >
                  Recibir todo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transfer.items.map((item) => {
                  const receivedQty = receivedQuantities[item.id] || 0;
                  const progress = (receivedQty / item.quantity) * 100;
                  const isFullyReceived =
                    item.quantity_received >= item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_auto] items-start gap-4 border-b pb-4 last:border-b-0"
                    >
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.product.sku}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Input
                            type="number"
                            min={item.quantity_received}
                            max={item.quantity}
                            value={receivedQty}
                            onChange={(e) =>
                              handleQuantityChange(item.id, e.target.value)
                            }
                            className="h-8 text-center"
                            disabled={isFullyReceived}
                          />
                        </div>
                        <div className="w-36">
                          <Progress value={progress} className="h-2" />
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">Recibido</span>
                            <span className="tabular-nums">
                              {receivedQty} de {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Recibiendo en</div>
              <div className="mt-1 font-medium">
                {transfer.destination_location.name}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Productos</span>
                <span className="font-medium">{totalProducts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Unidades a recibir
                </span>
                <span className="font-medium">{totalUnits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Unidades recibidas
                </span>
                <span className="font-medium">{totalReceived}</span>
              </div>
              <div className="space-y-2 border-t pt-4">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? "Confirmando…" : "Confirmar recepción"}
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/transferencias/${transfer.id}`}>Cancelar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
