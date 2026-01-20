"use client";

import {
  AlertCircle,
  Archive,
  Copy,
  History,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Trash,
  Truck,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ArchiveProductDialog } from "@/components/productos/archive-product-dialog";
import { DeleteProductDialog } from "@/components/productos/delete-product-dialog";
import { PriceHistoryDialog } from "@/components/productos/price-history-dialog";
import { StockManagementDialog } from "@/components/productos/stock-management-dialog";
import { StockMovementsDialog } from "@/components/productos/stock-movements-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDebounce } from "@/hooks/use-debounce";
import {
  getCategories,
  type CategoryWithChildren,
} from "@/lib/services/categories";
import { getProducts, type Product } from "@/lib/services/products";

const PAGE_SIZE = 20;

export default function ProductosPage() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["active"]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Categories for filter
  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Popover states
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  // Dialog states
  const [stockManagementProduct, setStockManagementProduct] =
    useState<Product | null>(null);
  const [priceHistoryProduct, setPriceHistoryProduct] =
    useState<Product | null>(null);
  const [stockMovementsProduct, setStockMovementsProduct] =
    useState<Product | null>(null);
  const [archiveProduct, setArchiveProduct] = useState<Product | null>(null);
  const [deleteProductDialog, setDeleteProductDialog] =
    useState<Product | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Load categories for filter
  useEffect(() => {
    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const allCategories = await getCategories();

        // Build hierarchy for display
        const categoryMap = new Map<string, CategoryWithChildren>();
        const roots: CategoryWithChildren[] = [];

        allCategories.forEach((cat) => {
          categoryMap.set(cat.id, { ...cat, children: [] });
        });

        allCategories.forEach((cat) => {
          const current = categoryMap.get(cat.id)!;
          if (cat.parent_id && categoryMap.has(cat.parent_id)) {
            const parent = categoryMap.get(cat.parent_id)!;
            parent.children!.push(current);
          } else {
            roots.push(current);
          }
        });

        setCategories(roots);
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine active filter
      let activeFilter: boolean | undefined;
      if (statusFilter.length === 1) {
        activeFilter = statusFilter.includes("active");
      }
      // If length is 0 or 2, don't filter (show all)

      const result = await getProducts({
        search: debouncedSearch || undefined,
        active: activeFilter,
        categoryId: categoryFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      });

      setProducts(result.data);
      setTotalCount(result.count);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Error desconocido");
      setError(error);
      toast.error("Error al cargar productos", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  // Filter functions
  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter(["active"]);
    setCategoryFilter(null);
    setPage(1);
  }

  const hasActiveFilters =
    search ||
    statusFilter.length !== 1 ||
    !statusFilter.includes("active") ||
    categoryFilter;

  // Format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Get category name by id
  function getCategoryName(id: string): string {
    function findInTree(cats: CategoryWithChildren[]): string | null {
      for (const cat of cats) {
        if (cat.id === id) return cat.name;
        if (cat.children && cat.children.length > 0) {
          const found = findInTree(cat.children);
          if (found) return found;
        }
      }
      return null;
    }
    return findInTree(categories) || "Categoría";
  }

  // Get status label
  function getStatusLabel(): string {
    if (statusFilter.length === 0 || statusFilter.length === 2) {
      return "Todos";
    }
    return statusFilter.includes("active") ? "Activo" : "Archivado";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Button asChild>
          <Link href="/productos/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Crear...
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              N
            </kbd>
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {statusFilter.length === 0 || statusFilter.length === 2 ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Estado
                </>
              ) : (
                <>
                  Estado
                  <Badge variant="secondary" className="ml-2">
                    {getStatusLabel()}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filtrar por estado" />
              <CommandList>
                <CommandEmpty>Sin resultados</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => toggleStatus("active")}>
                    <Checkbox
                      checked={statusFilter.includes("active")}
                      className="mr-2"
                    />
                    Activo
                  </CommandItem>
                  <CommandItem onSelect={() => toggleStatus("archived")}>
                    <Checkbox
                      checked={statusFilter.includes("archived")}
                      className="mr-2"
                    />
                    Archivado
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Category Filter */}
        <Popover
          open={categoryPopoverOpen}
          onOpenChange={setCategoryPopoverOpen}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {!categoryFilter ? (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Categoría
                </>
              ) : (
                <>
                  Categoría
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryName(categoryFilter)}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filtrar por categoría" />
              <CommandList>
                <CommandEmpty>
                  {categoriesLoading ? "Cargando..." : "Sin categorías"}
                </CommandEmpty>
                <CommandGroup>
                  {categories.map((category) => (
                    <div key={category.id}>
                      {/* Parent category */}
                      <CommandItem
                        onSelect={() => {
                          setCategoryFilter(
                            categoryFilter === category.id ? null : category.id
                          );
                          setCategoryPopoverOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={categoryFilter === category.id}
                          className="mr-2"
                        />
                        <span className="font-medium">{category.name}</span>
                      </CommandItem>

                      {/* Child categories (indented) */}
                      {category.children?.map((child) => (
                        <CommandItem
                          key={child.id}
                          onSelect={() => {
                            setCategoryFilter(
                              categoryFilter === child.id ? null : child.id
                            );
                            setCategoryPopoverOpen(false);
                          }}
                          className="pl-8"
                        >
                          <Checkbox
                            checked={categoryFilter === child.id}
                            className="mr-2"
                          />
                          {child.name}
                        </CommandItem>
                      ))}
                    </div>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription>
            {error.message}
            <Button
              variant="outline"
              size="sm"
              onClick={loadProducts}
              className="mt-2 ml-2"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-6 w-[70px] rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No hay productos</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">
            {hasActiveFilters
              ? "No se encontraron productos con los filtros aplicados"
              : "Creá tu primer producto para empezar"}
          </p>
          <Button onClick={() => router.push("/productos/nuevo")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear producto
          </Button>
        </div>
      )}

      {/* Products Table */}
      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Producto</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Costo s/IVA</TableHead>
                  <TableHead className="text-center">Precio</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/productos/${product.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU {product.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-blue-600 font-medium">
                        {product.stock_quantity || 0}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      {product.cost ? formatCurrency(product.cost) : "-"}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-blue-600 font-medium">
                        {formatCurrency(product.price)}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={product.active ? "default" : "secondary"}
                      >
                        {product.active ? "Activo" : "Archivado"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/productos/${product.id}`);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setStockManagementProduct(product);
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Gestionar Stock
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/productos/nuevo?duplicate=${product.id}`);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setPriceHistoryProduct(product);
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Historial de Precios
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setStockMovementsProduct(product);
                            }}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Movimientos de Stock
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setArchiveProduct(product);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            {product.active ? "Archivar" : "Activar"}
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteProductDialog(product);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, totalCount)} de {totalCount}{" "}
                resultados
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={
                          page === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      // Show pages around current page
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {stockManagementProduct && (
        <StockManagementDialog
          product={stockManagementProduct}
          onClose={() => setStockManagementProduct(null)}
          onSuccess={() => {
            setStockManagementProduct(null);
            loadProducts();
          }}
        />
      )}

      {priceHistoryProduct && (
        <PriceHistoryDialog
          productId={priceHistoryProduct.id}
          productName={priceHistoryProduct.name}
          open={true}
          onOpenChange={(open) => {
            if (!open) setPriceHistoryProduct(null);
          }}
        />
      )}

      {stockMovementsProduct && (
        <StockMovementsDialog
          productId={stockMovementsProduct.id}
          productName={stockMovementsProduct.name}
          open={true}
          onOpenChange={(open) => {
            if (!open) setStockMovementsProduct(null);
          }}
        />
      )}

      {archiveProduct && (
        <ArchiveProductDialog
          product={archiveProduct}
          onClose={() => setArchiveProduct(null)}
          onSuccess={() => {
            setArchiveProduct(null);
            loadProducts();
          }}
        />
      )}

      {deleteProductDialog && (
        <DeleteProductDialog
          product={deleteProductDialog}
          onClose={() => setDeleteProductDialog(null)}
          onSuccess={() => {
            setDeleteProductDialog(null);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
