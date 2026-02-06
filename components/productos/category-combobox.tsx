"use client";

import { useMemo, useState } from "react";

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

import { CategoryFormSheet } from "@/components/configuracion/category-form-sheet";

import { type Category } from "@/lib/services/categories";
import { ArrowLeft, ChevronRight, ChevronsUpDown, Plus } from "lucide-react";

interface CategoryComboboxProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  categories: Category[];
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function CategoryCombobox({
  value,
  onChange,
  disabled,
  categories: initialCategories,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  /* const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  ); */
  const [searchQuery, setSearchQuery] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "add-sub">("create");
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  // Sync with props
  /*   useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]); */

  // Update selected category
  const selectedCategory = useMemo(() => {
    if (value) {
      return categories.find((c) => c.id === value) || null;
    }
    return null;
  }, [value, categories]);
  // Visible categories
  const visibleCategories = useMemo(() => {
    if (searchQuery.trim()) {
      return categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return categories.filter((cat) =>
      currentParentId ? cat.parent_id === currentParentId : !cat.parent_id,
    );
  }, [categories, currentParentId, searchQuery]);

  // Categories with children
  const categoriesWithChildren = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((cat) => {
      if (cat.parent_id) set.add(cat.parent_id);
    });
    return set;
  }, [categories]);

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

  function handleCreateClick() {
    setOpen(false);

    if (currentParentId) {
      // Estamos dentro de una categoría → crear subcategoría
      const parent = categories.find((c) => c.id === currentParentId);
      console.log("Creating subcategory for parent:", parent);
      setParentCategory(parent || null);
      setSheetMode("add-sub");
    } else {
      // Estamos en root → crear categoría padre
      setParentCategory(null);
      setSheetMode("create");
    }

    setTimeout(() => {
      setSheetOpen(true);
    }, 100);
  }

  function handleCreateSuccess(newCategory?: Category) {
    if (newCategory) {
      setCategories((prev) =>
        [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)),
      );
      onChange(newCategory.id);
    }
  }

  // Determinar texto del botón
  const createButtonText = currentParentId
    ? "Crear subcategoría"
    : "Crear categoría";

  const selectedCategoryDisplay = useMemo(() => {
    if (!selectedCategory) return null;

    if (selectedCategory.parent_id) {
      const parent = categories.find(
        (c) => c.id === selectedCategory.parent_id,
      );
      return {
        name: selectedCategory.name,
        parentName: parent?.name || null,
      };
    }

    return {
      name: selectedCategory.name,
      parentName: null,
    };
  }, [selectedCategory, categories]);

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {selectedCategoryDisplay ? (
              <span className="truncate text-left">
                {selectedCategoryDisplay.name}
                {selectedCategoryDisplay.parentName && (
                  <span className="text-muted-foreground">
                    {" "}
                    en {selectedCategoryDisplay.parentName}
                  </span>
                )}
              </span>
            ) : (
              "Seleccionar categoría"
            )}
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
              {breadcrumb.length > 0 && !searchQuery && (
                <>
                  <CommandGroup>
                    <CommandItem onSelect={navigateBack}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver
                    </CommandItem>
                  </CommandGroup>

                  <CommandGroup>
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
                    <span className="flex-1">{category.name}</span>
                    {categoriesWithChildren.has(category.id) && (
                      <ChevronRight className="ml-2 h-4 w-4 text-muted-foreground" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreateClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  {createButtonText}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        category={parentCategory}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
