"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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

import { SupplierDialog } from "@/components/proveedores/supplier-dialog";

import { type Supplier } from "@/lib/services/suppliers";
import { cn } from "@/lib/utils";

interface SupplierComboboxProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  suppliers?: Supplier[];
}

export function SupplierCombobox({
  value,
  onChange,
  disabled,
  suppliers: initialSuppliers = [],
}: SupplierComboboxProps) {
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);

  const [searchQuery, setSearchQuery] = useState("");
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const selectedSupplier = useMemo(() => {
    if (value) {
      return suppliers.find((s) => s.id === value) || null;
    }
    return null;
  }, [value, suppliers]);

  function handleSelect(supplierId: string) {
    onChange(supplierId === value ? null : supplierId);
    setOpen(false);
    setSearchQuery("");
  }

  function handleCreateSuccess(newSupplier: Supplier) {
    // Agregar al estado local y seleccionar
    setSuppliers((prev) =>
      [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)),
    );
    onChange(newSupplier.id);
  }

  function handleCreateClick() {
    setOpen(false);
    setTimeout(() => {
      createButtonRef.current?.click();
    }, 100);
  }

  const filteredSuppliers = searchQuery
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tax_id?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : suppliers;

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            {selectedSupplier ? selectedSupplier.name : "Seleccionar proveedor"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nombre o CUIT..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No se encontraron proveedores</CommandEmpty>
              <CommandGroup>
                {filteredSuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onSelect={() => handleSelect(supplier.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === supplier.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{supplier.name}</span>
                      {supplier.tax_id && (
                        <span className="text-xs text-muted-foreground">
                          {supplier.tax_id_type || "DOC"}: {supplier.tax_id}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateClick}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nuevo proveedor
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <SupplierDialog
        mode="create"
        trigger={
          <button ref={createButtonRef} type="button" className="hidden">
            Crear
          </button>
        }
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
