"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

/* function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function unformatCuit(value: string): string {
  return value.replace(/\D/g, "");
} */

import React from "react";

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
    // Replace with your actual action:
    // await completeOnboardingAction({ name, cuit, phone })
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* --- Company name --- */}
      <div className="space-y-2">
        <label
          htmlFor="ob-name"
          className="block text-sm text-muted-foreground"
        >
          Nombre de la empresa
        </label>
        <input
          id="ob-name"
          type="text"
          placeholder="Ej: Comercio de Juan"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-foreground/25"
        />
      </div>

      {/* --- CUIT --- */}
      <div className="space-y-2">
        <label
          htmlFor="ob-cuit"
          className="block text-sm text-muted-foreground"
        >
          CUIT
        </label>
        <input
          id="ob-cuit"
          type="text"
          placeholder="XX-XXXXXXXX-X"
          value={formatCuit(form.cuit)}
          onChange={(e) =>
            setForm({ ...form, cuit: unformatCuit(e.target.value) })
          }
          maxLength={13}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-foreground/25"
        />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Clave Unica de Identificacion Tributaria de tu empresa. La encontras
          en tu constancia de AFIP.
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* --- Phone --- */}
      <div className="space-y-2">
        <label
          htmlFor="ob-phone"
          className="block text-sm text-muted-foreground"
        >
          Telefono
        </label>
        <input
          id="ob-phone"
          type="text"
          placeholder="Ej: 11 1234-5678"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-foreground/25"
        />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Opcional. Lo usamos para contactarte si hay algun problema con tu
          cuenta.
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* --- Submit --- */}
      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Crear organizacion
      </button>
    </form>
  );
}
