import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = React.useState<Date>(date);

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

        <div className="py-4 space-y-3">
          {/* Date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate
                  ? format(selectedDate, "d 'de' MMMM 'de' yyyy", {
                      locale: es,
                    })
                  : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={es}
                initialFocus
              />
            </PopoverContent>
          </Popover>

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
