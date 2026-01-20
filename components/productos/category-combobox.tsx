"use client";

import { ArrowLeft, Check, ChevronRight, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  getCategories,
  getCategoryById,
  getSubcategories,
  type Category,
} from "@/lib/services/categories";
import { cn } from "@/lib/utils";

interface CategoryComboboxProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function CategoryCombobox({
  value,
  onChange,
  disabled,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // Load initial categories or subcategories
  const loadCategories = useCallback(async (parentId: string | null = null) => {
    setIsLoading(true);
    try {
      if (parentId) {
        const data = await getSubcategories(parentId);
        setCategories(data);
      } else {
        const data = await getCategories();
        // Filter to only show root categories (no parent)
        const rootCategories = data.filter((cat) => !cat.parent_id);
        setCategories(rootCategories);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar categorías", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load selected category info
  useEffect(() => {
    async function loadSelectedCategory() {
      if (value) {
        try {
          const category = await getCategoryById(value);
          setSelectedCategory(category);
        } catch {
          setSelectedCategory(null);
        }
      } else {
        setSelectedCategory(null);
      }
    }
    loadSelectedCategory();
  }, [value]);

  // Load categories when popover opens
  useEffect(() => {
    if (open) {
      loadCategories(currentParentId);
    }
  }, [open, currentParentId, loadCategories]);

  // Search categories
  useEffect(() => {
    if (!open) return;

    const searchCategories = async () => {
      if (searchQuery.trim()) {
        setIsLoading(true);
        try {
          const data = await getCategories(searchQuery);
          setCategories(data);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Error desconocido";
          toast.error("Error al buscar categorías", { description: errorMessage });
        } finally {
          setIsLoading(false);
        }
      } else {
        loadCategories(currentParentId);
      }
    };

    const debounce = setTimeout(searchCategories, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, open, currentParentId, loadCategories]);

  async function navigateToCategory(category: Category) {
    // Check if category has children
    const children = await getSubcategories(category.id);

    if (children.length > 0) {
      // Navigate into this category
      setBreadcrumb((prev) => [...prev, { id: category.id, name: category.name }]);
      setCurrentParentId(category.id);
      setSearchQuery("");
    } else {
      // Select this category (it's a leaf)
      handleSelect(category);
    }
  }

  function navigateBack() {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);

      const newParentId =
        newBreadcrumb.length > 0
          ? newBreadcrumb[newBreadcrumb.length - 1].id
          : null;
      setCurrentParentId(newParentId);
      setSearchQuery("");
    }
  }

  function handleSelect(category: Category) {
    onChange(category.id === value ? null : category.id);
    setOpen(false);
    setSearchQuery("");
    // Reset navigation
    setBreadcrumb([]);
    setCurrentParentId(null);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset navigation when closing
      setBreadcrumb([]);
      setCurrentParentId(null);
      setSearchQuery("");
    }
  }

  function getDisplayText(): string {
    if (!selectedCategory) return "Seleccionar categoría";

    if (selectedCategory.parent_id) {
      // Try to find parent name from breadcrumb or show just category name
      return selectedCategory.name;
    }

    return selectedCategory.name;
  }

  // Check which categories have children (for showing chevron)
  const [categoriesWithChildren, setCategoriesWithChildren] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function checkChildren() {
      if (!open || categories.length === 0) return;

      const checks = await Promise.all(
        categories.map(async (cat) => {
          const children = await getSubcategories(cat.id);
          return { id: cat.id, hasChildren: children.length > 0 };
        })
      );

      const withChildren = new Set(
        checks.filter((c) => c.hasChildren).map((c) => c.id)
      );
      setCategoriesWithChildren(withChildren);
    }

    checkChildren();
  }, [open, categories]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {getDisplayText()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar categoría..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Cargando...
              </div>
            ) : (
              <>
                {/* Back button when navigating */}
                {breadcrumb.length > 0 && !searchQuery && (
                  <>
                    <CommandGroup>
                      <CommandItem onSelect={navigateBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading={breadcrumb[breadcrumb.length - 1].name}>
                      {/* Current category can be selected */}
                      <CommandItem
                        onSelect={() => {
                          const currentCat = categories.find(
                            (c) => c.parent_id === currentParentId
                          );
                          if (currentCat) {
                            handleSelect({
                              ...currentCat,
                              id: currentParentId!,
                              name: breadcrumb[breadcrumb.length - 1].name,
                            } as Category);
                          } else {
                            // Select the parent directly
                            onChange(currentParentId);
                            setOpen(false);
                            setBreadcrumb([]);
                            setCurrentParentId(null);
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === currentParentId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Seleccionar &quot;{breadcrumb[breadcrumb.length - 1].name}&quot;
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                <CommandEmpty>No se encontraron categorías</CommandEmpty>

                <CommandGroup heading={breadcrumb.length > 0 ? "Subcategorías" : undefined}>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.id}
                      onSelect={() => navigateToCategory(category)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === category.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{category.name}</span>
                      {categoriesWithChildren.has(category.id) && (
                        <ChevronRight className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
