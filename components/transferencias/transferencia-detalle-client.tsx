"use client";

import {
  ArrowRight,
  ChevronRight,
  Download,
  Ellipsis,
  PackageCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

import { cancelTransferAction } from "@/lib/actions/transfers";
import { downloadTransferPdf } from "@/lib/pdf/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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
  notes: string | null;
  transfer_date: string;
  created_at: string;
  source_location: { id: string; name: string };
  destination_location: { id: string; name: string };
  creator: { id: string; name: string | null } | null;
  items: TransferItem[];
}

const statusLabels: Record<string, string> = {
  in_transit: "En tránsito",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusVariants: Record<string, "secondary" | "default" | "destructive"> =
  {
    in_transit: "secondary",
    completed: "default",
    cancelled: "destructive",
  };

// ─── Component ────────────────────────────────────────

interface TransferenciaDetalleClientProps {
  transfer: Transfer;
}

export function TransferenciaDetalleClient({
  transfer,
}: TransferenciaDetalleClientProps) {
  const router = useRouter();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, startCancelTransition] = useTransition();

  const totalReceived = transfer.items.reduce(
    (sum, item) => sum + item.quantity_received,
    0,
  );
  const totalQuantity = transfer.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const progressValue =
    totalQuantity > 0 ? (totalReceived / totalQuantity) * 100 : 0;

  const handleCancel = () => {
    startCancelTransition(async () => {
      try {
        await cancelTransferAction(transfer.id);
        toast.success("Transferencia cancelada");
        setCancelDialogOpen(false);
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Error al cancelar la transferencia");
      }
    });
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: es,
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="gap-4">
          <Link
            href="/transferencias"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
          >
            Transferencias
            <ChevronRight className="h-3 w-3" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{transfer.transfer_number}</h1>
            <Badge variant={statusVariants[transfer.status]}>
              {statusLabels[transfer.status]}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {transfer.status === "in_transit" && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar transferencia
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="default" size="default" className="h-8" asChild>
                <Link href={`/transferencias/${transfer.id}/recibir`}>
                  <PackageCheck className="size-4" />
                  Recibir
                </Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="default"
            className="h-8"
            onClick={() =>
              downloadTransferPdf(
                transfer.id,
                `remito-${transfer.transfer_number}.pdf`,
              )
            }
          >
            <Download className="size-4" />
            Descargar remito
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Origin / Destination */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Origen
                  </Label>
                  <div className="text-lg font-medium">
                    {transfer.source_location.name}
                  </div>
                </div>
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <ArrowRight className="size-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Destino
                  </Label>
                  <div className="text-lg font-medium">
                    {transfer.destination_location.name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  Productos transferidos
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Progress value={progressValue} className="w-36" />
                  <div>
                    {totalReceived} / {totalQuantity}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transfer.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`py-4 ${index !== transfer.items.length - 1 ? "border-b" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/productos/${item.product.id}`}
                        className="text-base font-medium underline decoration-muted-foreground underline-offset-4 hover:underline"
                      >
                        {item.product.name}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        SKU: {item.product.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span className="font-medium">Recibido:</span>
                        <span className="font-mono">
                          {item.quantity_received}/{item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Details */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Fecha de transferencia
                </Label>
                <div className="font-medium">
                  {formatDate(transfer.transfer_date)}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm text-muted-foreground">Creada</Label>
                <div className="text-sm">{formatDate(transfer.created_at)}</div>
              </div>

              {transfer.creator && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm text-muted-foreground">
                    Creada por
                  </Label>
                  <div className="text-sm">{transfer.creator.name}</div>
                </div>
              )}

              {transfer.notes && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm text-muted-foreground">Notas</Label>
                  <div className="text-sm">{transfer.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar transferencia</AlertDialogTitle>
            <AlertDialogDescription>
              Se devolverá el stock no recibido a la ubicación de origen. Los
              productos ya recibidos no se verán afectados. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelando…" : "Cancelar transferencia"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
