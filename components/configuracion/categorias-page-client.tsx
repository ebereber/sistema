"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { CategoryFormSheet } from "@/components/configuracion/category-form-sheet";
import { CategoryTable } from "@/components/configuracion/category-table";
import { deleteCategoryAction } from "@/lib/actions/categories";
import type { CategoryWithChildren } from "@/lib/services/categories";

const ITEMS_PER_PAGE = 20;

interface CategoriasPageClientProps {
  initialCategories: CategoryWithChildren[];
}

export function CategoriasPageClient({
  initialCategories,
}: CategoriasPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<
    "create" | "edit-parent" | "edit-sub" | "add-sub"
  >("create");
  const [sheetCategory, setSheetCategory] =
    useState<CategoryWithChildren | null>(null);

  // Client-side filtering
  const filteredCategories = search.trim()
    ? initialCategories.filter((cat) =>
        cat.name.toLowerCase().includes(search.toLowerCase()),
      )
    : initialCategories;

  // Pagination
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset page on search change
  /* useEffect(() => {
    setCurrentPage(1);
  }, [search]); */

  function handleEdit(category: CategoryWithChildren) {
    setSheetMode("edit-parent");
    setSheetCategory(category);
    setSheetOpen(true);
  }

  function handleEditSubcategory(subcategory: CategoryWithChildren) {
    setSheetMode("edit-sub");
    setSheetCategory(subcategory);
    setSheetOpen(true);
  }

  function handleAddNew() {
    setSheetMode("create");
    setSheetCategory(null);
    setSheetOpen(true);
  }

  function handleAddSubcategory(parentCategory: CategoryWithChildren) {
    setSheetMode("add-sub");
    setSheetCategory(parentCategory);
    setSheetOpen(true);
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategoryAction(id);
      toast.success("Categoría eliminada correctamente");
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar la categoría", {
        description: errorMessage,
      });
    }
  }

  function handleSuccess() {
    router.refresh();
  }

  // Generate page numbers
  function getPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar categoría
        </Button>
      </div>

      {/* Content */}
      <CategoryTable
        categories={paginatedCategories}
        onEdit={handleEdit}
        onEditSubcategory={handleEditSubcategory}
        onDelete={handleDelete}
        onAddSubcategory={handleAddSubcategory}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>

            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === "ellipsis" ? (
                  <span className="flex size-9 items-center justify-center">
                    ...
                  </span>
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Sheet */}
      <CategoryFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        category={sheetCategory}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
