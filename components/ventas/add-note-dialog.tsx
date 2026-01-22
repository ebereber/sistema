"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  onNoteChange: (note: string) => void;
  onSave: () => void;
}

export function AddNoteDialog({
  open,
  onOpenChange,
  note,
  onNoteChange,
  onSave,
}: AddNoteDialogProps) {
  const handleSave = () => {
    onSave();
    onOpenChange(false);
  };

  const handleDelete = () => {
    onNoteChange("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nota</DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Escribí una nota para esta venta..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter className="bg-muted/50 -mx-4 -mb-4 rounded-b-xl border-t p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className={note ? "" : "invisible"}
            >
              Eliminar nota
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
