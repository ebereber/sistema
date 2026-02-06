"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboardingAction } from "@/lib/actions/organization";

function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function unformatCuit(value: string): string {
  return value.replace(/\D/g, "");
}

export function OnboardingForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    cuit: "",
    phone: "",
  });

  const cuitDigits = unformatCuit(form.cuit);
  const isValid = form.name.trim().length > 0 && cuitDigits.length === 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await completeOnboardingAction({
        name: form.name.trim(),
        cuit: cuitDigits,
        phone: form.phone.trim() || undefined,
      });
      toast.success("Organización creada correctamente");
      router.push("/");
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("Error al crear la organización");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="onboarding-name">Nombre de la empresa *</Label>
        <Input
          id="onboarding-name"
          placeholder="Ej: Comercio de Juan"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-cuit">CUIT *</Label>
        <Input
          id="onboarding-cuit"
          placeholder="XX-XXXXXXXX-X"
          value={formatCuit(form.cuit)}
          onChange={(e) =>
            setForm({ ...form, cuit: unformatCuit(e.target.value) })
          }
          maxLength={13}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="onboarding-phone">Teléfono (opcional)</Label>
        <Input
          id="onboarding-phone"
          placeholder="Ej: 11 1234-5678"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear organización
      </Button>
    </form>
  );
}
