"use client";

import {
  Check,
  ChevronsUpDown,
  Package,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Category } from "@/lib/services/categories";
import type { ProductForSale } from "@/lib/services/sales";

import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ProductItem } from "./product-item";

export interface ProductSearchPanelRef {
  updateStock: (
    soldItems: { productId: string | null; quantity: number }[],
  ) => void;
}

interface ProductSearchPanelProps {
  allProducts: ProductForSale[];
  topSellingProducts: ProductForSale[];
  categories: Category[];
  onProductSelect: (product: ProductForSale) => void;
}

export const ProductSearchPanel = forwardRef<
  ProductSearchPanelRef,
  ProductSearchPanelProps
>(({ allProducts, topSellingProducts, categories, onProductSelect }, ref) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductForSale[]>(allProducts);

  // Keep products in sync when server data changes
  useEffect(() => {
    setProducts(allProducts);
  }, [allProducts]);

  // Expose function to update stock locally after a sale
  useImperativeHandle(ref, () => ({
    updateStock: (soldItems) => {
      setProducts((prev) =>
        prev.map((product) => {
          const soldItem = soldItems.find(
            (item) => item.productId === product.id,
          );
          if (soldItem) {
            return {
              ...product,
              stockQuantity: product.stockQuantity - soldItem.quantity,
            };
          }
          return product;
        }),
      );
    },
  }));

  // Client-side filtering with useMemo -- instant results
  const displayedProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    // No filters active: show top selling
    if (!searchTerm && !selectedCategory) {
      if (topSellingProducts.length > 0) {
        return topSellingProducts.map((p) => ({
          ...p,
          stockQuantity:
            products.find((sp) => sp.id === p.id)?.stockQuantity ??
            p.stockQuantity,
        }));
      }
      return [];
    }

    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm) ||
        product.barcode?.toLowerCase().includes(searchTerm);

      const matchesCategory =
        !selectedCategory || product.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, topSellingProducts, search, selectedCategory]);

  // Handle keyboard shortcut for search focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("pos-product-search")?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value === "all" ? null : value);
  }, []);

  const hasFilters = search.trim() || selectedCategory;
  const showTopSellingHeader =
    !hasFilters &&
    topSellingProducts.length > 0 &&
    displayedProducts.length > 0;
  const showEmptyPrompt = !hasFilters && topSellingProducts.length === 0;

  return (
    <div className="flex h-full flex-col  ">
      {/* Search header */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pos-product-search"
            type="search"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-16 h-12"
          />
        </div>

        {/* Category tabs */}
        <div className="flex-shrink-0  min-w-[200px]  ">
          <Popover>
            <PopoverTrigger asChild className=" h-12">
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name
                  : "Todas las categorías"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar categoría..." />
                <CommandList>
                  <CommandEmpty>No se encontró categoría.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => handleCategoryChange("all")}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          !selectedCategory ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      Todas las categorías
                    </CommandItem>
                    {categories.map((category) => (
                      <CommandItem
                        key={category.id}
                        value={category.name}
                        onSelect={() => handleCategoryChange(category.id)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedCategory === category.id
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        {category.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Products list */}
      <ScrollArea className="flex-1 h-full pr-4 py-2">
        <div className="">
          {showEmptyPrompt ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">
                Busca un producto o selecciona una categoria
              </h3>
              <p className="text-sm text-muted-foreground">
                Usa la barra de busqueda o los filtros de categoria
              </p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">Sin productos</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No se encontraron productos con esa busqueda"
                  : "No hay productos disponibles"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {showTopSellingHeader && (
                <div className="flex items-center gap-2 px-1 pb-1 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="size-4" />
                  Mas vendidos
                </div>
              )}
              {displayedProducts.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  onClick={onProductSelect}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

ProductSearchPanel.displayName = "ProductSearchPanel";
