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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  disconnectMercadoLibreAction,
  syncPricesToMercadoLibreAction,
  syncProductsFromMercadoLibreAction,
  updateMeliPriceListAction,
} from "@/lib/actions/mercadolibre";
import {
  disconnectTiendanubeStoreAction,
  registerWebhooksAction,
  syncProductsFromTiendanubeAction,
} from "@/lib/actions/tiendanube";
import type { Tables } from "@/lib/supabase/types";
import { ProductDeduplicationPanel } from "./product-deduplication-panel";

type TiendanubeStore = Tables<"tiendanube_stores">;
type MeliAccount = Tables<"mercadolibre_accounts">;

interface PriceList {
  id: string;
  name: string;
  adjustment_type: string | null;
  adjustment_percentage: number | null;
}

interface IntegracionesPageClientProps {
  userId: string;
  initialStore: TiendanubeStore | null;
  syncedProductsCount: number;
  meliAccount: MeliAccount | null;
  meliSyncedProductsCount: number;
  priceLists: PriceList[];
}

export function IntegracionesPageClient({
  userId,
  initialStore,
  syncedProductsCount,
  meliAccount,
  meliSyncedProductsCount,
  priceLists,
}: IntegracionesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // TN state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegisteringWebhooks, setIsRegisteringWebhooks] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  // MeLi state
  const [isMeliSyncing, setIsMeliSyncing] = useState(false);
  const [isMeliPriceSyncing, setIsMeliPriceSyncing] = useState(false);
  const [isMeliDisconnecting, setIsMeliDisconnecting] = useState(false);
  const [meliDisconnectDialogOpen, setMeliDisconnectDialogOpen] =
    useState(false);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>(
    meliAccount?.price_list_id || "none",
  );

  // Show toasts from query params (MeLi OAuth callback)
  useEffect(() => {
    const meliParam = searchParams.get("mercadolibre");
    const errorParam = searchParams.get("error");

    if (meliParam === "connected") {
      toast.success("Mercado Libre conectado");
    } else if (errorParam === "meli_auth_error") {
      toast.error("Error al conectar Mercado Libre");
    } else if (errorParam === "meli_no_code") {
      toast.error("No se recibió el código de autorización de Mercado Libre");
    } else if (errorParam === "meli_save_failed") {
      toast.error("Error al guardar la conexión con Mercado Libre");
    } else if (errorParam === "meli_no_org") {
      toast.error("No se encontró la organización del usuario");
    }

    // Clean URL params after showing toast
    if (meliParam || (errorParam && errorParam.startsWith("meli"))) {
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  // ---- TN handlers ----

  async function handleSync() {
    if (!initialStore) return;

    setIsSyncing(true);
    try {
      const result = await syncProductsFromTiendanubeAction(
        initialStore.store_id,
        userId,
      );

      const parts = [`Creados: ${result.created}`];
      if (result.linked > 0) {
        parts.push(`Vinculados: ${result.linked}`);
      }
      const description = parts.join(", ");

      if (result.errors.length > 0) {
        toast.warning("Sincronización completada con errores", {
          description: `${description}, Errores: ${result.errors.length}`,
        });
      } else {
        toast.success("Sincronización completada", { description });
      }

      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al sincronizar", { description: errorMessage });
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

  // ---- MeLi handlers ----

  async function handleMeliSync() {
    setIsMeliSyncing(true);
    try {
      const result = await syncProductsFromMercadoLibreAction();

      const parts = [`Creados: ${result.created}`];
      if (result.linked > 0) {
        parts.push(`Vinculados: ${result.linked}`);
      }
      if (result.removed > 0) {
        parts.push(`Desvinculados: ${result.removed}`);
      }
      const description = parts.join(", ");

      if (result.errors.length > 0) {
        toast.warning("Sincronización completada con errores", {
          description: `${description}, Errores: ${result.errors.length}`,
        });
      } else {
        toast.success("Sincronización completada", { description });
      }

      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al sincronizar", { description: errorMessage });
    } finally {
      setIsMeliSyncing(false);
    }
  }

  async function handleMeliDisconnect() {
    if (!meliAccount) return;

    setIsMeliDisconnecting(true);
    try {
      await disconnectMercadoLibreAction(meliAccount.meli_user_id);
      toast.success("Mercado Libre desconectado");
      setMeliDisconnectDialogOpen(false);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al desconectar Mercado Libre", {
        description: errorMessage,
      });
    } finally {
      setIsMeliDisconnecting(false);
    }
  }

  async function handleMeliPriceListChange(value: string) {
    setSelectedPriceListId(value);
    try {
      await updateMeliPriceListAction(value === "none" ? null : value);
      toast.success("Lista de precios actualizada");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar la lista de precios", {
        description: errorMessage,
      });
    }
  }

  async function handleMeliPriceSync() {
    setIsMeliPriceSyncing(true);
    try {
      const result = await syncPricesToMercadoLibreAction();

      const parts: string[] = [];
      if (result.updated > 0) parts.push(`${result.updated} actualizados`);
      if (result.priceSkipped > 0)
        parts.push(
          `${result.priceSkipped} con precio no modificable (catalogo MeLi)`,
        );
      if (result.errors.length > 0)
        parts.push(`${result.errors.length} errores`);
      const desc = parts.join(", ");

      if (result.errors.length > 0) {
        toast.warning("Precios sincronizados con errores", {
          description: desc,
        });
        console.log("Sync errors:", result.errors);
      } else if (result.priceSkipped > 0 && result.updated === 0) {
        toast.info("No se actualizaron precios", {
          description: desc,
        });
      } else {
        toast.success("Precios sincronizados", {
          description: desc,
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al sincronizar precios", {
        description: errorMessage,
      });
    } finally {
      setIsMeliPriceSyncing(false);
    }
  }

  // Determine MeLi token status
  const isMeliTokenExpired = meliAccount
    ? new Date(meliAccount.token_expires_at) < new Date()
    : false;

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
                        : "\u2014"}
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

        {/* Mercado Libre Card */}
        <Card>
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
              {meliAccount ? (
                isMeliTokenExpired ? (
                  <Badge
                    variant="outline"
                    className="border-red-600 text-red-600"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Requiere reconexión
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-green-600 text-green-600"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Conectada
                  </Badge>
                )
              ) : (
                <Badge variant="secondary">No conectada</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {meliAccount ? (
              <>
                {/* Account info */}
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Cuenta
                    </span>
                    <span className="text-sm font-medium">
                      {meliAccount.nickname || meliAccount.meli_user_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ID</span>
                    <span className="text-sm font-mono">
                      {meliAccount.meli_user_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Conectada el
                    </span>
                    <span className="text-sm">
                      {format(
                        new Date(meliAccount.connected_at),
                        "d MMM yyyy, HH:mm",
                        { locale: es },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Productos sincronizados
                    </span>
                    <Badge variant="secondary">{meliSyncedProductsCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estado
                    </span>
                    {isMeliTokenExpired ? (
                      <Badge
                        variant="outline"
                        className="border-red-600 text-red-600"
                      >
                        Requiere reconexión
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-600 text-green-600"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Activa
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Price list selector */}
                <div className="space-y-2">
                  <Label className="text-sm">Lista de precios</Label>
                  <Select
                    value={selectedPriceListId}
                    onValueChange={handleMeliPriceListChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin lista (precio base)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Sin lista (precio base)
                      </SelectItem>
                      {priceLists.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id}>
                          {pl.name} (
                          {pl.adjustment_type === "AUMENTO" ? "+" : "-"}
                          {pl.adjustment_percentage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ajusta los precios publicados en MercadoLibre para compensar
                    comisiones.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleMeliSync}
                    disabled={isMeliSyncing}
                    className="w-full"
                  >
                    {isMeliSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isMeliSyncing
                      ? "Sincronizando..."
                      : "Sincronizar productos"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMeliPriceSync}
                    disabled={isMeliPriceSyncing}
                    className="w-full"
                  >
                    {isMeliPriceSyncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isMeliPriceSyncing
                      ? "Sincronizando..."
                      : "Sincronizar precios"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setMeliDisconnectDialogOpen(true)}
                  >
                    <Link2Off className="mr-2 h-4 w-4" />
                    Desconectar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Conectá tu cuenta de Mercado Libre para gestionar
                  publicaciones y pedidos desde un solo lugar.
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sincronizar publicaciones y stock
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Importar pedidos automáticamente
                  </li>
                  <li className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5" />
                    Lista de precios diferenciada
                  </li>
                </ul>
                <Button asChild className="w-full">
                  <a href="/api/mercadolibre/auth">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Conectar Mercado Libre
                  </a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TN Disconnect Dialog */}
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

      {/* MeLi Disconnect Dialog */}
      <AlertDialog
        open={meliDisconnectDialogOpen}
        onOpenChange={setMeliDisconnectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Desconectar Mercado Libre?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la conexión con la cuenta{" "}
              <strong>
                {meliAccount?.nickname || meliAccount?.meli_user_id}
              </strong>{" "}
              y todos los vínculos entre productos.
              <span className="mt-2 block text-sm">
                Los productos locales no serán eliminados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMeliDisconnecting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMeliDisconnect}
              disabled={isMeliDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMeliDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2Off className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ProductDeduplicationPanel />
    </div>
  );
}
