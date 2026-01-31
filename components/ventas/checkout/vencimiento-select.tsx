"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VencimientoSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function VencimientoSelect({
  value,
  onValueChange,
}: VencimientoSelectProps) {
  const calcularFecha = (dias: number): string => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
  };

  const opciones = [
    { value: "7", label: "7 días", fecha: calcularFecha(7) },
    { value: "15", label: "15 días", fecha: calcularFecha(15) },
    { value: "30", label: "30 días", fecha: calcularFecha(30) },
    { value: "45", label: "45 días", fecha: calcularFecha(45) },
    { value: "60", label: "60 días", fecha: calcularFecha(60) },
    { value: "90", label: "90 días", fecha: calcularFecha(90) },
  ];

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">Vencimiento</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-auto gap-2">
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label} - {opcion.fecha}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
