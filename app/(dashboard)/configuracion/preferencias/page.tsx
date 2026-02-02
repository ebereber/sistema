"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Info, Settings } from "lucide-react";
import { useState } from "react";

export default function PreferenciasPage() {
  // Estados para Configuración General
  const [pesosEnabled, setPesosEnabled] = useState(true);
  const [dolaresEnabled, setDolaresEnabled] = useState(false);
  const [ventaStockInsuficiente, setVentaStockInsuficiente] = useState("warn");
  const [omitirPago, setOmitirPago] = useState(false);
  const [permitirCambioPrecio, setPermitirCambioPrecio] = useState(false);
  const [modoOperador, setModoOperador] = useState(false);
  const [mostrarDatosEmpresa, setMostrarDatosEmpresa] = useState(true);
  const [modificarImporteDevolucion, setModificarImporteDevolucion] =
    useState(true);
  const [modificarMedioPagoDevolucion, setModificarMedioPagoDevolucion] =
    useState(true);
  const [redondeo, setRedondeo] = useState("100");
  const [variantesEnabled, setVariantesEnabled] = useState(false);

  // Estados para Impresora Térmica
  const [impresoraEnabled, setImpresoraEnabled] = useState(true);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showCustomer, setShowCustomer] = useState(true);
  const [showSeller, setShowSeller] = useState(true);
  const [showOrganization, setShowOrganization] = useState(true);
  const [anchoTicket, setAnchoTicket] = useState("80mm");
  const [qzEnabled, setQzEnabled] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);

  const handleConnect = () => {
    // Simular conexión
    setQzConnected(!qzConnected);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        {/* Card: Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              Configuración general
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Monedas habilitadas */}
              <div className="rounded-lg border px-3">
                <div className="flex flex-row items-center gap-3 py-3">
                  <div className="flex-1">
                    <Label className="font-medium text-sm">
                      Monedas habilitadas
                    </Label>
                    <p className="text-sm text-muted-foreground leading-normal">
                      Seleccioná las monedas que podés usar en ventas y compras
                    </p>
                  </div>
                  <div className="flex flex-row gap-4">
                    <label className="flex cursor-pointer items-center justify-end gap-2 text-sm">
                      <Checkbox
                        checked={pesosEnabled}
                        onCheckedChange={(checked) =>
                          setPesosEnabled(checked as boolean)
                        }
                      />
                      Pesos
                    </label>
                    <label className="flex cursor-pointer items-center justify-end gap-2 text-sm">
                      <Checkbox
                        checked={dolaresEnabled}
                        onCheckedChange={(checked) =>
                          setDolaresEnabled(checked as boolean)
                        }
                      />
                      Dólares
                    </label>
                  </div>
                </div>
              </div>

              {/* Sección Ventas */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Ventas
                </h3>
                <div className="rounded-lg border px-3">
                  {/* Venta con stock insuficiente */}
                  <fieldset className="mt-2 flex flex-col gap-6 border-b pb-3">
                    <legend className="mb-3 pb-2 text-sm font-medium">
                      Venta con stock insuficiente
                    </legend>
                    <RadioGroup
                      value={ventaStockInsuficiente}
                      onValueChange={setVentaStockInsuficiente}
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
                            Permitir ventas sin advertencia ni confirmación.
                            Ideal si se trabaja a pedido.
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
                            Bloquear (no recomendado)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Bloquea cualquier venta sin stock. Recomendamos sólo
                            advertir, esta opción es muy restrictiva.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </fieldset>

                  {/* Omitir pago al crear ventas */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="omitirPago"
                        className="font-medium text-sm"
                      >
                        Omitir pago al crear ventas
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Si está activado, no se pedirá registrar un pago al
                        momento de crear una venta.
                      </p>
                    </div>
                    <Switch
                      id="omitirPago"
                      checked={omitirPago}
                      onCheckedChange={setOmitirPago}
                    />
                  </div>

                  {/* Permitir cambio de precios */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="permitirCambioPrecio"
                        className="font-medium text-sm"
                      >
                        Permitir cambio de precios en ventas
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Habilitá la modificación de precios al agregar productos
                        a una venta.
                      </p>
                    </div>
                    <Switch
                      id="permitirCambioPrecio"
                      checked={permitirCambioPrecio}
                      onCheckedChange={setPermitirCambioPrecio}
                    />
                  </div>

                  {/* Modo operador */}
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="modoOperador"
                        className="font-medium text-sm"
                      >
                        Modo operador
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Permite seleccionar qué operador realiza cada venta
                        cuando varios cajeros comparten una PC.
                      </p>
                    </div>
                    <Switch
                      id="modoOperador"
                      checked={modoOperador}
                      onCheckedChange={setModoOperador}
                    />
                  </div>

                  {/* Mostrar datos de la empresa */}
                  <div className="flex flex-row items-center gap-3 py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="mostrarDatosEmpresa"
                        className="font-medium text-sm"
                      >
                        Mostrar datos de la empresa en comprobantes
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Incluir datos de la empresa en facturas, presupuestos,
                        remitos y comprobantes.
                      </p>
                    </div>
                    <Switch
                      id="mostrarDatosEmpresa"
                      checked={mostrarDatosEmpresa}
                      onCheckedChange={setMostrarDatosEmpresa}
                    />
                  </div>
                </div>
              </div>

              {/* Sección Devoluciones */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Devoluciones
                </h3>
                <div className="rounded-lg border px-3">
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="modificarImporteDevolucion"
                        className="font-medium text-sm"
                      >
                        Modificar importe de devoluciones
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Permití ajustar el total de la devolución antes de
                        confirmarla.
                      </p>
                    </div>
                    <Switch
                      id="modificarImporteDevolucion"
                      checked={modificarImporteDevolucion}
                      onCheckedChange={setModificarImporteDevolucion}
                    />
                  </div>
                  <div className="flex flex-row items-center gap-3 py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="modificarMedioPagoDevolucion"
                        className="font-medium text-sm"
                      >
                        Modificar medio de pago en devoluciones
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Activá la selección manual del medio de pago usado en la
                        devolución.
                      </p>
                    </div>
                    <Switch
                      id="modificarMedioPagoDevolucion"
                      checked={modificarMedioPagoDevolucion}
                      onCheckedChange={setModificarMedioPagoDevolucion}
                    />
                  </div>
                </div>
              </div>

              {/* Sección Productos */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Productos
                </h3>
                <div className="rounded-lg border px-3">
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <Label htmlFor="redondeo" className="font-medium text-sm">
                      Redondeo de precios
                    </Label>
                    <Select value={redondeo} onValueChange={setRedondeo}>
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
                  <div className="flex flex-row items-center gap-3 py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="variantesEnabled"
                        className="font-medium text-sm"
                      >
                        Habilitar variantes de productos
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Permitir crear productos con variantes como talle, color
                        u otras opciones.
                      </p>
                    </div>
                    <Switch
                      id="variantesEnabled"
                      checked={variantesEnabled}
                      onCheckedChange={setVariantesEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Impresora Térmica */}
        <Card>
          <CardHeader>
            <CardTitle>Impresora térmica para tickets</CardTitle>
            <CardDescription>
              Activalo sólo si usás impresora térmica para tus tickets de venta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="rounded-lg border px-3">
                <div className="flex flex-row items-center gap-3 py-3">
                  <Label
                    htmlFor="impresoraEnabled"
                    className="font-medium text-sm"
                  >
                    Habilitar impresora térmica para tickets
                  </Label>
                  <Switch
                    id="impresoraEnabled"
                    checked={impresoraEnabled}
                    onCheckedChange={setImpresoraEnabled}
                  />
                </div>
              </div>

              <div className="rounded-lg border px-3">
                <div className="flex flex-row items-center gap-3 border-b py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor="autoPrint"
                        className="font-medium text-sm"
                      >
                        Imprimir automáticamente
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Función próximamente disponible</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground leading-normal">
                      Imprimir sin mostrar ventana de confirmación
                      (próximamente)
                    </p>
                  </div>
                  <Switch
                    id="autoPrint"
                    checked={autoPrint}
                    onCheckedChange={setAutoPrint}
                    disabled
                  />
                </div>

                <div className="flex flex-row items-center gap-3 border-b py-3">
                  <div className="flex-1">
                    <Label
                      htmlFor="showCustomer"
                      className="font-medium text-sm"
                    >
                      Mostrar datos del cliente
                    </Label>
                    <p className="text-sm text-muted-foreground leading-normal">
                      Incluir nombre y datos fiscales del cliente en el ticket
                    </p>
                  </div>
                  <Switch
                    id="showCustomer"
                    checked={showCustomer}
                    onCheckedChange={setShowCustomer}
                  />
                </div>

                <div className="flex flex-row items-center gap-3 border-b py-3">
                  <div className="flex-1">
                    <Label htmlFor="showSeller" className="font-medium text-sm">
                      Mostrar vendedor
                    </Label>
                    <p className="text-sm text-muted-foreground leading-normal">
                      Incluir el nombre del vendedor en el ticket
                    </p>
                  </div>
                  <Switch
                    id="showSeller"
                    checked={showSeller}
                    onCheckedChange={setShowSeller}
                  />
                </div>

                <div className="flex flex-row items-center gap-3 border-b py-3">
                  <div className="flex-1">
                    <Label
                      htmlFor="showOrganization"
                      className="font-medium text-sm"
                    >
                      Mostrar datos de la empresa
                    </Label>
                    <p className="text-sm text-muted-foreground leading-normal">
                      Incluir datos fiscales de la empresa en comprobantes no
                      fiscales
                    </p>
                  </div>
                  <Switch
                    id="showOrganization"
                    checked={showOrganization}
                    onCheckedChange={setShowOrganization}
                  />
                </div>

                <div className="flex flex-row items-center gap-3 border-b py-3">
                  <Label className="font-medium text-sm">
                    Ancho del ticket
                  </Label>
                  <RadioGroup
                    value={anchoTicket}
                    onValueChange={setAnchoTicket}
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

                <div className="space-y-0">
                  <div className="flex flex-row items-center gap-3 border-b py-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="qzEnabled"
                        className="font-medium text-sm"
                      >
                        Impresión directa con QZ Tray
                      </Label>
                      <p className="text-sm text-muted-foreground leading-normal">
                        Imprimí directamente sin abrir ventana del navegador
                      </p>
                    </div>
                    <Switch
                      id="qzEnabled"
                      checked={qzEnabled}
                      onCheckedChange={setQzEnabled}
                    />
                  </div>

                  {/* Estado de conexión QZ - Se muestra solo si qzEnabled está activado */}
                  {qzEnabled && (
                    <div className="flex flex-row items-center gap-3 border-b py-3">
                      <div className="flex-1">
                        <Label className="font-medium text-sm">
                          Estado de conexión
                        </Label>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {qzConnected ? "Conectado" : "Desconectado"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleConnect}
                      >
                        {qzConnected ? "Desconectar" : "Conectar"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled>
                  Guardar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
