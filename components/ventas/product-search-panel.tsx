"use client";

import { Loader2, Package, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { getCategories, type Category } from "@/lib/services/categories";
import {
  searchProductsForSale,
  type ProductForSale,
} from "@/lib/services/sales";
import { ProductItem } from "./product-item";

interface ProductSearchPanelProps {
  onProductSelect: (product: ProductForSale) => void;
}

export function ProductSearchPanel({
  onProductSelect,
}: ProductSearchPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductForSale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    }
    loadCategories();
  }, []);

  // Load products when search or category changes
  useEffect(() => {
    async function loadProducts() {
      setIsSearching(true);
      try {
        const data = await searchProductsForSale({
          search: debouncedSearch || undefined,
          categoryId: selectedCategory || undefined,
        });
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setIsSearching(false);
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [debouncedSearch, selectedCategory]);

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

  return (
    <div className="flex h-full flex-col  ">
      {/* Search header */}
      <div className="pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pos-product-search"
            type="search"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-16 h-12"
          />
          {/* <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground sm:inline-block">
            {navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"}F
          </kbd> */}
        </div>
      </div>

      {/* Category tabs */}
      <div className=" ">
        <ScrollArea className="w-full">
          <Tabs
            defaultValue="all"
            value={selectedCategory || "all"}
            onValueChange={handleCategoryChange}
          >
            <TabsList className="inline-flex h-9 w-max">
              <TabsTrigger value="all" className="text-xs">
                Todos
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ScrollArea>
      </div>

      {/* Products list */}
      <ScrollArea className="flex-1 h-full pr-4 py-2">
        <div className="">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">Sin productos</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No se encontraron productos con esa búsqueda"
                  : "No hay productos disponibles"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {products.map((product) => (
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
}
