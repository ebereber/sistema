"use client";

import { ArrowLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Category,
} from "@/lib/services/categories";

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
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load ALL categories once
  const loadAllCategories = useCallback(async () => {
    if (loadedRef.current && allCategories.length > 0) return;
    setIsLoading(true);
    try {
      const data = await getCategories();
      setAllCategories(data);
      loadedRef.current = true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar categorías", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [allCategories.length]);

  // Load selected category display name
  useEffect(() => {
    async function loadSelectedCategory() {
      if (value) {
        // Try from cache first
        const cached = allCategories.find((c) => c.id === value);
        if (cached) {
          setSelectedCategory(cached);
          return;
        }
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
  }, [value, allCategories]);

  // Load on first open
  useEffect(() => {
    if (open) {
      loadAllCategories();
    }
  }, [open, loadAllCategories]);

  // Derive current visible categories from memory (no API calls)
  const visibleCategories = useMemo(() => {
    if (searchQuery.trim()) {
      return allCategories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return allCategories.filter((cat) =>
      currentParentId ? cat.parent_id === currentParentId : !cat.parent_id,
    );
  }, [allCategories, currentParentId, searchQuery]);

  // Derive which categories have children (no API calls)
  const categoriesWithChildren = useMemo(() => {
    const set = new Set<string>();
    allCategories.forEach((cat) => {
      if (cat.parent_id) set.add(cat.parent_id);
    });
    return set;
  }, [allCategories]);

  function navigateToCategory(category: Category) {
    if (categoriesWithChildren.has(category.id)) {
      setBreadcrumb((prev) => [
        ...prev,
        { id: category.id, name: category.name },
      ]);
      setCurrentParentId(category.id);
      setSearchQuery("");
    } else {
      handleSelect(category);
    }
  }

  function navigateBack() {
    if (breadcrumb.length > 0) {
      const newBreadcrumb = [...breadcrumb];
      newBreadcrumb.pop();
      setBreadcrumb(newBreadcrumb);
      setCurrentParentId(
        newBreadcrumb.length > 0
          ? newBreadcrumb[newBreadcrumb.length - 1].id
          : null,
      );
      setSearchQuery("");
    }
  }

  function handleSelect(category: Category) {
    onChange(category.id === value ? null : category.id);
    setOpen(false);
    setSearchQuery("");
    setBreadcrumb([]);
    setCurrentParentId(null);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setBreadcrumb([]);
      setCurrentParentId(null);
      setSearchQuery("");
    }
  }

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
          {selectedCategory?.name || "Seleccionar categoría"}
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
                {breadcrumb.length > 0 && !searchQuery && (
                  <>
                    <CommandGroup>
                      <CommandItem onSelect={navigateBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                      </CommandItem>
                    </CommandGroup>

                    <CommandGroup
                    /* heading={breadcrumb[breadcrumb.length - 1].name} */
                    >
                      <CommandItem
                        onSelect={() => {
                          onChange(currentParentId);
                          setOpen(false);
                          setBreadcrumb([]);
                          setCurrentParentId(null);
                        }}
                        className="font-semibold"
                      >
                        {breadcrumb[breadcrumb.length - 1].name}
                      </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                <CommandEmpty>No se encontraron categorías</CommandEmpty>

                <CommandGroup
                  heading={
                    breadcrumb.length > 0
                      ? "Subcategorías"
                      : searchQuery
                        ? "Resultados"
                        : undefined
                  }
                >
                  {visibleCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.id}
                      onSelect={() => navigateToCategory(category)}
                    >
                      {/*   <Check
                        className={cn(
                          "h-4 w-4",
                          value === category.id ? "opacity-100" : "opacity-0",
                        )}
                      /> */}
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
