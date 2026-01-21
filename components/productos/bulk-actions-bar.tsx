"use client";

import { Archive, ChevronDown, FolderTree, Trash, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUpdatePrices: () => void;
  onUpdateStock: () => void;
  onAssignCategory: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  onUpdatePrices,
  onUpdateStock,
  onAssignCategory,
  onArchive,
  onDelete,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-background flex-wrap  rounded-lg px-4 py-2 flex items-center justify-between gap-4 border border-border">
      <div className="flex items-center gap-4">
        <span className="font-medium text-sm">
          Seleccionados: {selectedCount}
        </span>

        {!allSelected && selectedCount < totalCount && (
          <Button
            variant="link"
            size="sm"
            onClick={onSelectAll}
            className="text-xs text-blue-600"
          >
            Seleccionar todos los {totalCount} productos
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-accent-foreground">Actualizar:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onUpdatePrices}
          className="text-xs"
        >
          Precios
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onUpdateStock}
          className="text-xs"
        >
          Stock
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Más
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAssignCategory}>
              <FolderTree className="mr-2 h-4 w-4" />
              Asignar categoría
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archivar/Desarchivar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className=""
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
