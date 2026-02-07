"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeftRight,
  Calendar,
  ChevronRight,
  Info,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { ProductSearchDialog } from "@/components/compras/product-search-dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  createTransferAction,
  getProductsByLocationAction,
} from "@/lib/actions/transfers";
import type { Product } from "@/lib/services/products";

interface Location {
  id: string;
  name: string;
  is_main: boolean | null;
  active: boolean | null;
}

interface TransferProduct {
  id: string;
  name: string;
  sku: string;
  availableStock: number;
  quantity: number;
}

interface NuevaTransferenciaClientProps {
  locations: Location[];
}

export function NuevaTransferenciaClient({
  locations,
}: NuevaTransferenciaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Default source = main location
  const mainLocation = locations.find((l) => l.is_main);
  const [sourceLocationId, setSourceLocationId] = useState(
    mainLocation?.id || locations[0]?.id || "",
  );
  const [destinationLocationId, setDestinationLocationId] = useState(
    locations.find((l) => l.id !== sourceLocationId)?.id || "",
  );
  const [transferDate, setTransferDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [markAsReceived, setMarkAsReceived] = useState(false);
  const [products, setProducts] = useState<TransferProduct[]>([]);

  // Products available at source location (for the search dialog)
  const [availableProducts, setAvailableProducts] = useState<
    { id: string; name: string; sku: string; stock: number }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Load products when source location changes
  useEffect(() => {
    if (!sourceLocationId) return;

    setLoadingProducts(true);
    getProductsByLocationAction(sourceLocationId)
      .then((data) => {
        setAvailableProducts(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || "",
            stock: p.availableStock,
          })),
        );
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, [sourceLocationId]);

  const handleSwapLocations = () => {
    const temp = sourceLocationId;
    setSourceLocationId(destinationLocationId);
    setDestinationLocationId(temp);
    setProducts([]); // Clear products since stock differs by location
  };

  const handleAddProducts = (
    selected: { id: string; name: string; sku: string }[],
  ) => {
    const newProducts: TransferProduct[] = selected
      .filter((s) => !products.some((p) => p.id === s.id))
      .map((s) => {
        const available = availableProducts.find((a) => a.id === s.id);
        return {
          id: s.id,
          name: s.name,
          sku: s.sku || "",
          availableStock: available?.stock || 0,
          quantity: 1,
        };
      });
    setProducts((prev) => [...prev, ...newProducts]);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              quantity: Math.max(1, Math.min(numValue, p.availableStock)),
            }
          : p,
      ),
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (products.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    if (sourceLocationId === destinationLocationId) {
      toast.error("Origen y destino no pueden ser iguales");
      return;
    }

    startTransition(async () => {
      try {
        const transferId = await createTransferAction({
          sourceLocationId,
          destinationLocationId,
          items: products.map((p) => ({
            productId: p.id,
            quantity: p.quantity,
          })),
          notes: notes || undefined,
          transferDate: transferDate.toISOString(),
          markAsReceived,
        });

        toast.success(
          markAsReceived
            ? "Transferencia creada y completada"
            : "Transferencia creada",
        );
        router.push(`/transferencias/${transferId}`);
      } catch (error) {
        console.error(error);
        toast.error("Error al crear la transferencia");
      }
    });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="gap-4">
        <Link
          href="/transferencias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline"
        >
          Transferencias
          <ChevronRight className="h-3 w-3" />
        </Link>
        <h1 className="text-3xl font-bold">Nueva transferencia</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Locations Card */}
            <Card>
              <CardHeader>
                <CardTitle>Ubicaciones</CardTitle>
                <CardDescription>
                  Seleccioná la ubicación de origen y destino
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Origen</Label>
                    <Select
                      value={sourceLocationId}
                      onValueChange={(val) => {
                        setSourceLocationId(val);
                        setProducts([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            disabled={loc.id === destinationLocationId}
                          >
                            {loc.name}
                            {loc.is_main && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Principal)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-primary/10 transition-all duration-300 hover:rotate-180 hover:bg-primary/20"
                            onClick={handleSwapLocations}
                          >
                            <ArrowLeftRight className="h-5 w-5 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Intercambiar ubicaciones
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="space-y-2">
                    <Label>Destino</Label>
                    <Select
                      value={destinationLocationId}
                      onValueChange={setDestinationLocationId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem
                            key={loc.id}
                            value={loc.id}
                            disabled={loc.id === sourceLocationId}
                          >
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Productos a transferir</CardTitle>
                  <ProductSearchDialog
                    products={
                      availableProducts.map((p) => ({
                        id: p.id,
                        name: p.name,
                        sku: p.sku,
                        stock: [{ quantity: p.stock }],
                        cost: 0,
                        price: 0,
                      })) as unknown as Product[]
                    }
                    excludedProductIds={products.map((p) => p.id)}
                    onProductsSelected={(selected) =>
                      handleAddProducts(
                        selected.map((s) => ({
                          id: s.id,
                          name: s.name,
                          sku: s.sku || "",
                        })),
                      )
                    }
                  />
                </div>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Agregá productos para transferir
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead className="w-32">Cantidad</TableHead>
                            <TableHead className="w-16" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="max-w-xl whitespace-normal font-medium">
                                  {product.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {product.sku} — Stock:{" "}
                                  {product.availableStock}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  max={product.availableStock}
                                  value={product.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      product.id,
                                      e.target.value,
                                    )
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() =>
                                    handleRemoveProduct(product.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-muted-foreground">
                        {products.length} producto
                        {products.length !== 1 ? "s" : ""} agregado
                        {products.length !== 1 ? "s" : ""}
                      </div>
                      <div className="text-sm font-medium">
                        Total: {totalQuantity} unidades
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label>Fecha de transferencia</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(transferDate, "d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={transferDate}
                        onSelect={(date) => date && setTransferDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Notas sobre esta transferencia…"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="markAsReceived"
                    checked={markAsReceived}
                    onCheckedChange={(checked) =>
                      setMarkAsReceived(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="markAsReceived"
                    className="text-sm font-normal"
                  >
                    Marcar como recibido en destino
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Se completará automáticamente y se sumará stock en
                        destino
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full text-base"
                    disabled={isPending || products.length === 0}
                  >
                    {isPending ? "Creando…" : "Crear transferencia"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
