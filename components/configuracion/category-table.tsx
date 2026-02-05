"use client";

import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Fragment, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CategoryWithChildren } from "@/lib/services/categories";

interface CategoryTableProps {
  categories: CategoryWithChildren[];
  onEdit: (category: CategoryWithChildren) => void;
  onEditSubcategory: (subcategory: CategoryWithChildren) => void;
  onDelete: (id: string) => void;
  onAddSubcategory: (parentCategory: CategoryWithChildren) => void;
}

export function CategoryTable({
  categories,
  onEdit,
  onEditSubcategory,
  onDelete,
  onAddSubcategory,
}: CategoryTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Sin categorías</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          No hay categorías creadas. Creá una nueva para empezar.
        </p>
      </div>
    );
  }

  // Group: only show root categories (level 0), subcategories are nested
  const rootCategories = categories;

  /*   function getSubcategories(parentId: string): CategoryWithChildren[] {
    return categories.filter((c) => c.parent_id === parentId);
  } */

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-full">Nombre</TableHead>
            <TableHead className="w-[70px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rootCategories.map((category) => {
            const subs = category.children || [];
            const hasSubs = subs.length > 0;
            const isExpanded = expandedIds.has(category.id);

            return (
              <Fragment key={category.id}>
                {/* Parent row */}
                <TableRow
                  className="group cursor-pointer"
                  onClick={() => hasSubs && toggleExpanded(category.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {hasSubs ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(category.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </Button>
                      ) : (
                        <div className="w-6" />
                      )}
                      <span className="font-medium">{category.name}</span>
                      {hasSubs && (
                        <span className="text-xs text-muted-foreground">
                          {subs.length}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(category);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddSubcategory(category);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar subcategoría
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(category.id);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>

                {/* Subcategory rows */}
                {isExpanded &&
                  subs.map((sub) => (
                    <TableRow key={sub.id} className="group bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2 pl-8">
                          <span className="text-muted-foreground">
                            {sub.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onEditSubcategory(sub)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDelete(sub.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                {/* Add subcategory row */}
                {isExpanded && (
                  <TableRow
                    key={`add-${category.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onAddSubcategory(category)}
                  >
                    <TableCell colSpan={2}>
                      <div className="flex items-center gap-2 pl-8 text-sm text-muted-foreground">
                        <Plus className="size-3.5" />
                        Agregar subcategoría
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
