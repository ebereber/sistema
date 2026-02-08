"use client";

import { Info, Loader2, Settings } from "lucide-react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  saveGeneralPreferencesAction,
  savePriceRoundingAction,
  saveTicketPreferencesAction,
} from "@/lib/actions/settings";
import type {
  GeneralPreferences,
  TicketPreferences,
} from "@/lib/services/settings";

// ─── Types ────────────────────────────────────────────

interface PreferenciasClientProps {
  initialGeneral: GeneralPreferences;
  initialTicket: TicketPreferences;
  initialRounding: { type: string };
}

// ─── Component ────────────────────────────────────────

export function PreferenciasClient({
  initialGeneral,
  initialTicket,
  initialRounding,
}: PreferenciasClientProps) {
  // ── General state ──
  const [isSavingGeneral, startGeneralTransition] = useTransition();
  const generalForm = useForm<GeneralPreferences & { rounding: string }>({
    defaultValues: {
      ...initialGeneral,
      rounding: initialRounding.type === "none" ? "1" : initialRounding.type,
    },
  });

  // ── Ticket state ──
  const [isSavingTicket, startTicketTransition] = useTransition();
  const ticketForm = useForm<TicketPreferences>({
    defaultValues: initialTicket,
  });

  // ── Watch values for reactive UI ──
  const general = useWatch({ control: generalForm.control });
  const ticket = useWatch({ control: ticketForm.control });

  // ── Save handlers ──
  const handleSaveGeneral = () => {
    const values = generalForm.getValues();
    startGeneralTransition(async () => {
      try {
        await saveGeneralPreferencesAction({
          stock_behavior: values.stock_behavior,
          skip_payment: values.skip_payment,
          allow_price_change: values.allow_price_change,
          show_company_on_vouchers: values.show_company_on_vouchers,
        });
        const roundingType = values.rounding === "1" ? "none" : values.rounding;
        await savePriceRoundingAction({ type: roundingType });
        toast.success("Configuración general guardada");
      } catch {
        toast.error("Error al guardar configuración");
      }
    });
  };

  const handleSaveTicket = () => {
    const values = ticketForm.getValues();
    startTicketTransition(async () => {
      try {
        await saveTicketPreferencesAction(values);
        toast.success("Configuración de tickets guardada");
      } catch {
        toast.error("Error al guardar configuración");
      }
    });
  };

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        {/* ═══ Card: Configuración General ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              Configuración general
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Ventas */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Ventas
                </h3>
                <div className="rounded-lg border px-3">
                  {/* Stock insuficiente */}
                  <fieldset className="mt-2 flex flex-col gap-6 border-b pb-3">
                    <legend className="mb-3 pb-2 text-sm font-medium">
                      Venta con stock insuficiente
                    </legend>
                    <RadioGroup
                      value={general.stock_behavior}
                      onValueChange={(val) =>
                        generalForm.setValue(
                          "stock_behavior",
                          val as GeneralPreferences["stock_behavior"],
                        )
                      }
                    >
                      <div className="flex flex-row items-center gap-3">
                        <RadioGroupItem value="warn" id="warn" />
                        <div className="flex-1">
                          <Label
                            htmlFor="warn"
                            className="font-normal leading-snug"
                          >
                            Advertir (Recomendado)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Mostrará un aviso y pedirá confirmación antes de
                            vender
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-3">
                        <RadioGroupItem value="allow" id="allow" />
                        <div className="flex-1">
                          <Label
                            htmlFor="allow"
                            className="font-normal leading-snug"
                          >
                            Permitir
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Permitir ventas sin advertencia ni confirmación
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-3">
                        <RadioGroupItem value="block" id="block" />
                        <div className="flex-1">
                          <Label
                            htmlFor="block"
                            className="font-normal leading-snug"
                          >
                            Bloquear
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Bloquea cualquier venta sin stock
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </fieldset>

                  {/* Omitir pago */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Omitir pago al crear ventas
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        No se pedirá registrar un pago al crear una venta
                      </p>
                    </div>
                    <Switch
                      checked={general.skip_payment}
                      onCheckedChange={(val) =>
                        generalForm.setValue("skip_payment", val)
                      }
                    />
                  </div>

                  {/* Permitir cambio de precios */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Permitir cambio de precios en ventas
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Modificar precios al agregar productos a una venta
                      </p>
                    </div>
                    <Switch
                      checked={general.allow_price_change}
                      onCheckedChange={(val) =>
                        generalForm.setValue("allow_price_change", val)
                      }
                    />
                  </div>

                  {/* Mostrar empresa en comprobantes */}
                  <div className="flex flex-row items-center gap-3 py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Mostrar datos de la empresa en comprobantes
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Incluir datos de la empresa en facturas, presupuestos y
                        remitos
                      </p>
                    </div>
                    <Switch
                      checked={general.show_company_on_vouchers}
                      onCheckedChange={(val) =>
                        generalForm.setValue("show_company_on_vouchers", val)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Productos
                </h3>
                <div className="rounded-lg border px-3">
                  <div className="flex flex-row items-center gap-3 py-3">
                    <Label className="font-medium text-sm">
                      Redondeo de precios
                    </Label>
                    <Select
                      value={general.rounding}
                      onValueChange={(val) =>
                        generalForm.setValue("rounding", val)
                      }
                    >
                      <SelectTrigger className="w-fit border-transparent hover:bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Sin redondeo</SelectItem>
                        <SelectItem value="10">Múltiplos de $10</SelectItem>
                        <SelectItem value="50">Múltiplos de $50</SelectItem>
                        <SelectItem value="100">Múltiplos de $100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isSavingGeneral}>
                  {isSavingGeneral && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Card: Impresora Térmica ═══ */}
        <Card>
          <CardHeader>
            <CardTitle>Impresora térmica para tickets</CardTitle>
            <CardDescription>
              Activalo sólo si usás impresora térmica para tus tickets de venta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="rounded-lg border px-3">
                <div className="flex flex-row items-center gap-3 py-3">
                  <Label className="font-medium text-sm">
                    Habilitar impresora térmica para tickets
                  </Label>
                  <Switch
                    checked={ticket.enabled}
                    onCheckedChange={(val) =>
                      ticketForm.setValue("enabled", val)
                    }
                  />
                </div>
              </div>

              {ticket.enabled && (
                <div className="rounded-lg border px-3">
                  {/* Auto print */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium text-sm">
                          Imprimir automáticamente
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Función próximamente disponible
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Imprimir sin mostrar ventana de confirmación
                        (próximamente)
                      </p>
                    </div>
                    <Switch checked={ticket.auto_print} disabled />
                  </div>

                  {/* Show customer */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Mostrar datos del cliente
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Incluir nombre y datos fiscales del cliente en el ticket
                      </p>
                    </div>
                    <Switch
                      checked={ticket.show_customer}
                      onCheckedChange={(val) =>
                        ticketForm.setValue("show_customer", val)
                      }
                    />
                  </div>

                  {/* Show seller */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Mostrar vendedor
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Incluir el nombre del vendedor en el ticket
                      </p>
                    </div>
                    <Switch
                      checked={ticket.show_seller}
                      onCheckedChange={(val) =>
                        ticketForm.setValue("show_seller", val)
                      }
                    />
                  </div>

                  {/* Show company */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Mostrar datos de la empresa
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Incluir datos fiscales de la empresa en el ticket
                      </p>
                    </div>
                    <Switch
                      checked={ticket.show_company}
                      onCheckedChange={(val) =>
                        ticketForm.setValue("show_company", val)
                      }
                    />
                  </div>

                  {/* Width */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <Label className="font-medium text-sm">
                      Ancho del ticket
                    </Label>
                    <RadioGroup
                      value={ticket.width}
                      onValueChange={(val) =>
                        ticketForm.setValue(
                          "width",
                          val as TicketPreferences["width"],
                        )
                      }
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="80mm" id="width-80" />
                        <Label htmlFor="width-80" className="font-normal">
                          80mm
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="57mm" id="width-57" />
                        <Label htmlFor="width-57" className="font-normal">
                          57mm
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* QZ Tray */}
                  <div className="flex flex-row items-center gap-3 py-3">
                    <div className="flex-1">
                      <Label className="font-medium text-sm">
                        Impresión directa con QZ Tray
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Imprimí directamente sin abrir ventana del navegador
                      </p>
                    </div>
                    <Switch
                      checked={ticket.qz_enabled}
                      onCheckedChange={(val) =>
                        ticketForm.setValue("qz_enabled", val)
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSaveTicket} disabled={isSavingTicket}>
                  {isSavingTicket && (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
