"use client";

import { useState } from "react";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChangeDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onDateChange: (date: Date) => void;
}

export function ChangeDateDialog({
  open,
  onOpenChange,
  date,
  onDateChange,
}: ChangeDateDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(date);

  const handleSave = () => {
    onDateChange(selectedDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fecha de emisión</DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={es}
            className="rounded-md border"
          />
          <p className="text-xs text-muted-foreground">
            La fecha de emisión afectará a la numeración de facturas y reportes.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
