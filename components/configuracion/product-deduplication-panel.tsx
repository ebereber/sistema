"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Merge,
  Package,
  Search,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/* import {
  detectDuplicatesAction,
  mergeDuplicatesAction,
  autoMergeAllDuplicatesAction,
} from "@/lib/actions/product-deduplication";
import type { DuplicateGroup, DuplicateCandidate } from "@/lib/services/product-matching"; */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  autoMergeAllDuplicatesAction,
  detectDuplicatesAction,
  mergeDuplicatesAction,
} from "@/lib/product-deduplication-actions";
import { DuplicateCandidate, DuplicateGroup } from "@/lib/product-matching";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductDeduplicationPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Auto-merge dialog
  const [autoMergeDialogOpen, setAutoMergeDialogOpen] = useState(false);
  const [isAutoMerging, setIsAutoMerging] = useState(false);

  // Load duplicates on mount
  useEffect(() => {
    loadDuplicates();
  }, []);

  async function loadDuplicates() {
    setIsLoading(true);
    try {
      const result = await detectDuplicatesAction();
      setDuplicates(result.duplicates);
      setTotalCount(result.totalDuplicateProducts);
    } catch (error) {
      console.error("Error loading duplicates:", error);
      toast.error("Error al cargar duplicados");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAutoMergeAll() {
    setIsAutoMerging(true);
    try {
      const result = await autoMergeAllDuplicatesAction();

      if (result.failed > 0) {
        toast.warning("Fusión completada con errores", {
          description: `${result.merged} fusionados, ${result.failed} fallaron`,
        });
      } else if (result.merged > 0) {
        toast.success("Productos fusionados", {
          description: `${result.merged} productos duplicados eliminados`,
        });
      } else {
        toast.info("No había duplicados para fusionar");
      }

      setAutoMergeDialogOpen(false);
      await loadDuplicates();
    } catch (error) {
      console.error("Error in auto-merge:", error);
      toast.error("Error al fusionar productos");
    } finally {
      setIsAutoMerging(false);
    }
  }

  function handleGroupMerged(groupIndex: number) {
    setDuplicates((prev) => prev.filter((_, i) => i !== groupIndex));
    setTotalCount((prev) => prev - duplicates[groupIndex].products.length + 1);
  }

  if (isLoading) {
    return <DeduplicationSkeleton />;
  }

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-base">Sin duplicados</CardTitle>
              <CardDescription>
                No se encontraron productos duplicados
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todos tus productos tienen identificadores únicos. Los productos
            importados de MercadoLibre y Tienda Nube se vincularán
            automáticamente si comparten el mismo SKU o código de barras.
          </p>
          <Button variant="outline" className="mt-4" onClick={loadDuplicates}>
            <Search className="mr-2 h-4 w-4" />
            Volver a buscar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-950">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                Productos duplicados detectados
              </CardTitle>
              <CardDescription>
                {duplicates.length} grupo{duplicates.length !== 1 ? "s" : ""}{" "}
                con {totalCount} productos en total
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDuplicates}>
              <Search className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button onClick={() => setAutoMergeDialogOpen(true)}>
              <Merge className="mr-2 h-4 w-4" />
              Fusionar todos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Estos productos comparten el mismo SKU o código de barras pero están
          registrados como productos separados. Revisá cada grupo y elegí cuál
          producto mantener.
        </p>

        <Accordion type="multiple" className="space-y-2">
          {duplicates.map((group, index) => (
            <DuplicateGroupCard
              key={`${group.matchType}-${group.matchKey}`}
              group={group}
              onMerged={() => handleGroupMerged(index)}
            />
          ))}
        </Accordion>
      </CardContent>

      {/* Auto-merge confirmation dialog */}
      <AlertDialog
        open={autoMergeDialogOpen}
        onOpenChange={setAutoMergeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              ¿Fusionar todos los duplicados?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Se fusionarán {duplicates.length} grupos de productos
                duplicados. Para cada grupo, se mantendrá el producto más
                antiguo y se transferirán las conexiones de los demás.
              </span>
              <span className="block font-medium text-foreground">
                Esta acción eliminará {totalCount - duplicates.length}{" "}
                productos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAutoMerging}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAutoMergeAll}
              disabled={isAutoMerging}
            >
              {isAutoMerging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Merge className="mr-2 h-4 w-4" />
              )}
              Fusionar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================================
// DUPLICATE GROUP CARD
// ============================================================================

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onMerged: () => void;
}

function DuplicateGroupCard({ group, onMerged }: DuplicateGroupCardProps) {
  const [selectedSurvivor, setSelectedSurvivor] = useState<string>(
    group.products[0].id,
  );
  const [isMerging, setIsMerging] = useState(false);

  async function handleMerge() {
    const duplicateIds = group.products
      .filter((p) => p.id !== selectedSurvivor)
      .map((p) => p.id);

    setIsMerging(true);
    try {
      const result = await mergeDuplicatesAction(
        selectedSurvivor,
        duplicateIds,
      );

      if (result.success) {
        toast.success("Productos fusionados", {
          description: `${result.mergedIds.length} productos eliminados`,
        });
        onMerged();
      } else {
        toast.error("Error al fusionar", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Error merging:", error);
      toast.error("Error al fusionar productos");
    } finally {
      setIsMerging(false);
    }
  }

  return (
    <AccordionItem
      value={`${group.matchType}-${group.matchKey}`}
      className="rounded-lg border px-4"
    >
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-center gap-3 text-left">
          <Badge variant="outline" className="font-mono">
            {group.matchType === "sku" ? "SKU" : "Código"}: {group.matchKey}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {group.products.length} productos
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Seleccioná el producto que querés mantener. Las conexiones de los
            demás productos serán transferidas a este.
          </p>

          <RadioGroup
            value={selectedSurvivor}
            onValueChange={setSelectedSurvivor}
            className="space-y-2"
          >
            {group.products.map((product) => (
              <ProductOptionCard
                key={product.id}
                product={product}
                isSelected={selectedSurvivor === product.id}
              />
            ))}
          </RadioGroup>

          <div className="flex justify-end">
            <Button onClick={handleMerge} disabled={isMerging}>
              {isMerging ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Merge className="mr-2 h-4 w-4" />
              )}
              Fusionar ({group.products.length - 1} producto
              {group.products.length > 2 ? "s" : ""} se eliminarán)
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ============================================================================
// PRODUCT OPTION CARD
// ============================================================================

interface ProductOptionCardProps {
  product: DuplicateCandidate;
  isSelected: boolean;
}

function ProductOptionCard({ product, isSelected }: ProductOptionCardProps) {
  const hasML = !!product.mappings.mercadolibre;
  const hasTN = !!product.mappings.tiendanube;

  return (
    <Label
      htmlFor={product.id}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      }`}
    >
      <RadioGroupItem value={product.id} id={product.id} className="mt-1" />

      {/* Product image */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {product.sku && <span className="font-mono">SKU: {product.sku}</span>}
          {product.price !== null && (
            <span>${product.price.toLocaleString("es-AR")}</span>
          )}
          {product.stock_quantity !== null && (
            <span>Stock: {product.stock_quantity}</span>
          )}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {hasML && (
            <Badge variant="secondary" className="text-xs py-0">
              MercadoLibre
            </Badge>
          )}
          {hasTN && (
            <Badge variant="secondary" className="text-xs py-0">
              Tienda Nube
            </Badge>
          )}
          {!hasML && !hasTN && (
            <Badge variant="outline" className="text-xs py-0">
              Sin conexiones
            </Badge>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && <Badge className="flex-shrink-0">Se mantiene</Badge>}
    </Label>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function DeduplicationSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}
