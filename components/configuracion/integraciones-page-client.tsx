"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Link2Off,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  disconnectTiendanubeStoreAction,
  registerWebhooksAction,
  syncProductsFromTiendanubeAction,
} from "@/lib/actions/tiendanube";
import type { Tables } from "@/lib/supabase/types";

type TiendanubeStore = Tables<"tiendanube_stores">;

interface IntegracionesPageClientProps {
  userId: string;
  initialStore: TiendanubeStore | null;
  syncedProductsCount: number;
}

export function IntegracionesPageClient({
  userId,
  initialStore,
  syncedProductsCount,
}: IntegracionesPageClientProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegisteringWebhooks, setIsRegisteringWebhooks] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  async function handleSync() {
    if (!initialStore) return;

    setIsSyncing(true);
    try {
      const result = await syncProductsFromTiendanubeAction(
        initialStore.store_id,
        userId,
      );

      if (result.errors.length > 0) {
        toast.warning("Sincronización completada con errores", {
          description: `Creados: ${result.created}, Actualizados: ${result.updated}, Errores: ${result.errors.length}`,
        });
      } else {
        toast.success("Sincronización completada", {
          description: `Creados: ${result.created}, Actualizados: ${result.updated}`,
        });
      }

      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al sincronizar", {
        description: errorMessage,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRegisterWebhooks() {
    if (!initialStore) return;

    setIsRegisteringWebhooks(true);
    try {
      const results = await registerWebhooksAction(initialStore.store_id);
      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        console.log("Webhook failures:", failures);
        toast.warning("Webhooks registrados parcialmente", {
          description: `${successes} registrados, ${failures.length} fallaron`,
        });
      } else {
        toast.success("Webhooks registrados", {
          description: `${successes} webhooks registrados correctamente`,
        });
      }

      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al registrar webhooks", {
        description: errorMessage,
      });
    } finally {
      setIsRegisteringWebhooks(false);
    }
  }

  async function handleDisconnect() {
    if (!initialStore) return;

    setIsDisconnecting(true);
    try {
      await disconnectTiendanubeStoreAction(initialStore.store_id, userId);
      toast.success("Tienda Nube desconectada");
      setDisconnectDialogOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al desconectar", {
        description: errorMessage,
      });
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conectá tu tienda online para sincronizar productos, stock y pedidos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tienda Nube Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                  <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Tienda Nube</CardTitle>
                  <CardDescription>E-commerce</CardDescription>
                </div>
              </div>
              {initialStore ? (
                <Badge
                  variant="outline"
                  className="border-green-600 text-green-600"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Conectada
                </Badge>
              ) : (
                <Badge variant="secondary">No conectada</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {initialStore ? (
              <>
                {/* Store info */}
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tienda
                    </span>
                    <span className="text-sm font-medium">
                      {initialStore.store_name || `#${initialStore.store_id}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Store ID
                    </span>
                    <span className="text-sm font-mono">
                      {initialStore.store_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Conectada el
                    </span>
                    <span className="text-sm">
                      {initialStore.connected_at
                        ? format(
                            new Date(initialStore.connected_at),
                            "d MMM yyyy, HH:mm",
                            { locale: es },
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Productos sincronizados
                    </span>
                    <Badge variant="secondary">{syncedProductsCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Webhooks
                    </span>
                    {initialStore.webhooks_registered ? (
                      <Badge
                        variant="outline"
                        className="border-green-600 text-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Activos
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No registrados</Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isSyncing ? "Sincronizando..." : "Sincronizar productos"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegisterWebhooks}
                    disabled={isRegisteringWebhooks}
                    className="w-full"
                  >
                    {isRegisteringWebhooks ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Bell className="mr-2 h-4 w-4" />
                    )}
                    {isRegisteringWebhooks
                      ? "Registrando..."
                      : "Registrar webhooks"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setDisconnectDialogOpen(true)}
                  >
                    <Link2Off className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Conectá tu Tienda Nube para sincronizar productos, stock y
                  pedidos automáticamente.
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Importar productos y categorías
                  </li>
                  <li className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sincronizar stock en tiempo real
                  </li>
                  <li className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5" />
                    Recibir pedidos de tu tienda online
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <a href="/api/tiendanube/auth">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Conectar Tienda Nube
                  </a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mercado Libre Placeholder Card */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
                  <ShoppingBag className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Mercado Libre</CardTitle>
                  <CardDescription>Marketplace</CardDescription>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary">Próximamente</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Esta integración estará disponible próximamente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Publicá tus productos en Mercado Libre y gestioná pedidos desde un
              solo lugar.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disconnect Dialog */}
      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Desconectar Tienda Nube?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la conexión con la tienda{" "}
              <strong>
                {initialStore?.store_name || `#${initialStore?.store_id}`}
              </strong>{" "}
              y todos los vínculos entre productos locales y de Tienda Nube.
              <span className="mt-2 block text-sm">
                Los productos locales no serán eliminados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
