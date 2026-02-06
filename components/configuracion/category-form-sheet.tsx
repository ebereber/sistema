"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  createCategoryAction,
  createSubcategoryAction,
  updateCategoryAction,
  updateCategoryWithSubsAction,
} from "@/lib/actions/categories";
import {
  type Category,
  type CategoryWithChildren,
} from "@/lib/services/categories";

type SheetMode =
  | "create" // New category + optional subcategories
  | "edit-parent" // Edit category name + manage subcategories
  | "edit-sub" // Edit single subcategory name
  | "add-sub"; // Add subcategory to existing parent

interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SheetMode;
  category?: CategoryWithChildren | null;
  onSuccess: (newCategory?: Category) => void;
}

interface SubItem {
  id?: string;
  name: string;
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  mode,
  category,
  onSuccess,
}: CategoryFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [subcategories, setSubcategories] = useState<SubItem[]>([]);
  const [newSubName, setNewSubName] = useState("");

  // Reset form when sheet opens
  useEffect(() => {
    if (!open) return;

    setNewSubName("");

    if (mode === "create") {
      setName("");
      setSubcategories([]);
    } else if (mode === "edit-parent" && category) {
      setName(category.name);
      setSubcategories(
        (category.children || []).map((s) => ({ id: s.id, name: s.name })),
      );
    } else if (mode === "edit-sub" && category) {
      setName(category.name);
      setSubcategories([]);
    } else if (mode === "add-sub") {
      setName("");
      setSubcategories([]);
    }
  }, [open, mode, category]);

  function addSubcategoryField() {
    if (!newSubName.trim()) return;
    setSubcategories((prev) => [...prev, { name: newSubName.trim() }]);
    setNewSubName("");
  }

  function removeSubcategory(index: number) {
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSubcategoryName(index: number, newName: string) {
    setSubcategories((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name: newName } : s)),
    );
  }

  async function handleSubmit() {
    console.log("handleSubmit - mode:", mode, "category:", category);
    setIsLoading(true);
    const finalSubcategories = [...subcategories];
    if (newSubName.trim() && showSubcategories) {
      finalSubcategories.push({ name: newSubName.trim() });
    }
    try {
      if (mode === "create") {
        if (!name.trim()) {
          toast.error("Ingresá el nombre de la categoría");
          setIsLoading(false);
          return;
        }
        const newCategory = await createCategoryAction({
          name: name.trim(),
          subcategories: finalSubcategories.map((s) => s.name).filter(Boolean),
        });
        toast.success("Categoría creada");
        onOpenChange(false);
        onSuccess(newCategory);
        return;
      }

      if (mode === "edit-parent" && category) {
        if (!name.trim()) {
          toast.error("Ingresá el nombre de la categoría");
          setIsLoading(false);
          return;
        }
        await updateCategoryWithSubsAction(
          category.id,
          name.trim(),
          finalSubcategories.filter((s) => s.name.trim()),
        );
        toast.success("Categoría actualizada");
        onOpenChange(false);
        onSuccess();
        return;
      }

      if (mode === "edit-sub" && category) {
        if (!name.trim()) {
          toast.error("Ingresá el nombre");
          setIsLoading(false);
          return;
        }
        await updateCategoryAction(category.id, name.trim());
        toast.success("Subcategoría actualizada");
        onOpenChange(false);
        onSuccess();
        return;
      }

      if (mode === "add-sub" && category) {
        if (!name.trim()) {
          toast.error("Ingresá el nombre de la subcategoría");
          setIsLoading(false);
          return;
        }
        const newSubcategory = await createSubcategoryAction(
          category.id,
          name.trim(),
        );
        toast.success("Subcategoría creada");
        onOpenChange(false);
        onSuccess(newSubcategory);
        return;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }

  function getTitle() {
    switch (mode) {
      case "create":
        return "Agregar categoría";
      case "edit-parent":
        return "Editar categoría";
      case "edit-sub":
        return "Editar subcategoría";
      case "add-sub":
        return `Agregar subcategoría a "${category?.name}"`;
    }
  }

  function getDescription() {
    switch (mode) {
      case "create":
        return "Creá una nueva categoría y agregá subcategorías si necesitás.";
      case "edit-parent":
        return "Modificá el nombre y gestioná las subcategorías.";
      case "edit-sub":
        return "Modificá el nombre de la subcategoría.";
      case "add-sub":
        return "Ingresá el nombre de la nueva subcategoría.";
    }
  }

  const showSubcategories = mode === "create" || mode === "edit-parent";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
          <SheetDescription>{getDescription()}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>
              {mode === "add-sub" ? "Nombre de la subcategoría *" : "Nombre *"}
            </Label>
            <Input
              placeholder={
                mode === "add-sub" ? "Ej: Cables" : "Ej: Electricidad"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!showSubcategories) handleSubmit();
                }
              }}
              autoFocus
            />
          </div>

          {/* Subcategories section */}
          {showSubcategories && (
            <div className="space-y-3">
              <Label>Subcategorías</Label>

              {subcategories.length > 0 && (
                <div className="space-y-2">
                  {subcategories.map((sub, index) => (
                    <div key={sub.id || index} className="flex gap-2">
                      <Input
                        value={sub.name}
                        onChange={(e) =>
                          updateSubcategoryName(index, e.target.value)
                        }
                        disabled={isLoading}
                        placeholder="Nombre"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeSubcategory(index)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Nueva subcategoría"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubcategoryField();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={addSubcategoryField}
                  disabled={isLoading || !newSubName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="px-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear categoría" : "Guardar cambios"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
