"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { getPaymentMethods } from "@/lib/services/payment-methods";
import type { PaymentMethod, PaymentMethodType } from "@/types/payment-method";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PaymentMethodSheet } from "./_components/payment-method-sheet";
import { PaymentMethodsTable } from "./_components/payment-methods-table";

export default function MediosDePagoPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<PaymentMethodType | null>(
    null,
  );
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(
    null,
  ); // ← NUEVO
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"type-selector" | "form">(
    "type-selector",
  );

  const debouncedSearch = useDebounce(search, 300);

  const loadPaymentMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPaymentMethods({
        search: debouncedSearch || undefined,
      });
      setPaymentMethods(data);
    } catch {
      toast.error("Error al cargar medios de pago");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  // Abrir sheet para CREAR
  function handleOpenSheet() {
    setEditingMethod(null); // ← IMPORTANTE: limpiar método en edición
    setCurrentStep("type-selector");
    setSelectedType(null);
    setSheetOpen(true);
  }

  // Abrir sheet para EDITAR
  function handleEdit(method: PaymentMethod) {
    setEditingMethod(method);
    setSelectedType(method.type);
    setCurrentStep("form"); // Saltar directo al formulario
    setSheetOpen(true);
  }

  // Cerrar sheet
  function handleCloseSheet(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      setTimeout(() => {
        setCurrentStep("type-selector");
        setSelectedType(null);
        setEditingMethod(null); // ← Limpiar método en edición
      }, 300);
    }
  }

  // Función para seleccionar tipo
  function handleTypeSelect(type: PaymentMethodType) {
    setSelectedType(type);
    setCurrentStep("form");
  }

  // Función para volver atrás
  function handleBack() {
    setCurrentStep("type-selector");
    setSelectedType(null);
  }

  return (
    <div className="space-y-6">
      {/* Search and Create */}
      <div className="flex items-center justify-between gap-4 md:flex-row flex-col">
        <div className="relative flex-1 md:max-w-sm  w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-fit">
          <Button onClick={handleOpenSheet} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:inline">Agregar Medio de Pago</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <PaymentMethodsTable
        paymentMethods={paymentMethods}
        isLoading={isLoading}
        onRefresh={loadPaymentMethods}
        onEdit={handleEdit}
      />

      <PaymentMethodSheet
        open={sheetOpen}
        onOpenChange={handleCloseSheet}
        currentStep={currentStep}
        paymentMethod={editingMethod ?? undefined}
        selectedType={selectedType}
        onTypeSelect={handleTypeSelect}
        onBack={handleBack}
        onSuccess={loadPaymentMethods}
      />
    </div>
  );
}
