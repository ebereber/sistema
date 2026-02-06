"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CircleCheck,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  Lock,
  Mail,
  Receipt,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ConfiguracionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const [activeTab, setActiveTab] = useState(currentTab);
  const [fiscalDialogOpen, setFiscalDialogOpen] = useState(false);

  // General tab form state
  const [generalForm, setGeneralForm] = useState({
    name: "Local 1",
    email: "",
    phone: "",
  });

  // ARCA tab form state
  const [closingDate, setClosingDate] = useState<Date | undefined>(undefined);
  const [taxSettings, setTaxSettings] = useState({
    iibbIsExempt: false,
    isIvaPerceptionAgent: false,
    isIibbPerceptionAgent: false,
    isRetentionAgent: false,
  });
  const [cbu, setCbu] = useState("");

  // Fiscal dialog state
  const [activitiesStartedAt, setActivitiesStartedAt] = useState<Date>(
    new Date(2018, 6, 1),
  );
  const [iibb, setIibb] = useState("");

  // Checklist state
  const [expandedStep, setExpandedStep] = useState<number | null>(4);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [delegationConfirmed, setDelegationConfirmed] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "arca") {
      router.push("/configuracion?tab=arca");
    } else {
      router.push("/configuracion");
    }
  };

  const steps = [
    {
      id: 1,
      title: "Completá tus datos fiscales",
      completed: true,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Serán utilizados para emitir facturas
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button
              variant="secondary"
              onClick={() => setFiscalDialogOpen(true)}
            >
              Ver datos fiscales
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Delegá la facturación electrónica",
      completed: true,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Delegá el web service de facturación electrónica para habilitar que
            La Pyme facture por vos desde ARCA.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button variant="secondary" disabled>
              Ya delegué la facturación
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://docs.lapyme.com.ar/como-delegar-un-web-service-en-arca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Ver paso a paso
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Confirmá la delegación de facturación en ARCA",
      completed: false,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Confirmá la delegación de facturación electrónica con ARCA para
            habilitar la emisión de comprobantes fiscales desde La Pyme.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button onClick={() => setConfirmationDialogOpen(true)}>
              Confirmar delegación
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: "Creá un punto de venta con facturación electrónica en ARCA",
      completed: true,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            El punto de venta es un código de 4 dígitos. Usá un punto de venta
            por sucursal. Si ya tenés un punto de venta válido, podés continuar
            al siguiente paso.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button variant="secondary" disabled>
              Ya tengo punto de venta
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://docs.lapyme.com.ar/como-crear-un-punto-de-venta-en-arca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Ver paso a paso
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: "Creá tu punto de venta en La Pyme",
      completed: false,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Completá con el número y nombre del punto de venta que creaste en
            ARCA.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Link href="/configuracion/puntos-venta">
              <Button>
                <span className="inline-flex items-center gap-1">
                  Crear punto de venta
                  <ExternalLink className="h-3 w-3" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;

  return (
    <div className="p-4 md:p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Organización</h1>

        {/* Tabs */}
        <div className="relative mb-6 flex overflow-x-auto border-b border-neutral-200 pb-1 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => handleTabChange("general")}
            className={`relative mb-0.5 px-2 py-1 text-sm font-medium transition-colors duration-200 hover:text-primary dark:hover:text-primary ${
              activeTab === "general"
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {activeTab === "general" && (
              <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white" />
            )}
            <div className="relative z-10">General</div>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("arca")}
            className={`relative mb-0.5 px-2 py-1 text-sm font-medium transition-colors duration-200 hover:text-primary dark:hover:text-primary ${
              activeTab === "arca"
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {activeTab === "arca" && (
              <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white" />
            )}
            <div className="relative z-10">Impositivo (ARCA)</div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Contact Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  Información de contacto
                </CardTitle>
                <CardDescription>
                  Estos datos se muestran en los emails y facturas, son visibles
                  para los cientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre de fantasía</Label>
                    <Input
                      id="name"
                      placeholder="Ej: El comercio de Juan"
                      value={generalForm.name}
                      onChange={(e) =>
                        setGeneralForm({ ...generalForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@ejemplo.com"
                        value={generalForm.email}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        placeholder="Ej: 11 1234-5678"
                        value={generalForm.phone}
                        onChange={(e) =>
                          setGeneralForm({
                            ...generalForm,
                            phone: e.target.value,
                          })
                        }
                      />
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

            {/* Logo Card */}
            <Card className="flex flex-col justify-between md:flex-row">
              <CardHeader className="w-full">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-muted-foreground" />
                  Logo de la organización
                </CardTitle>
                <CardDescription>
                  Subí el logo de tu empresa para que aparezca en emails,
                  facturas y documentos.
                  <p>Tamaño: 128x128px mínimo, máximo 512KB.</p>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center px-4">
                <div className="h-[128px] w-[128px]">
                  <div
                    role="presentation"
                    tabIndex={0}
                    className="h-full w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-card text-center text-foreground transition-colors duration-300"
                  >
                    <input
                      accept="image/jpeg,image/png"
                      tabIndex={-1}
                      type="file"
                      style={{
                        border: 0,
                        clip: "rect(0 0 0 0)",
                        clipPath: "inset(50%)",
                        height: 1,
                        margin: "0 -1px -1px 0",
                        overflow: "hidden",
                        padding: 0,
                        position: "absolute",
                        width: 1,
                        whiteSpace: "nowrap",
                      }}
                    />
                    <div className="flex h-full items-center justify-center">
                      <p className="cursor-pointer text-sm text-muted-foreground">
                        Hacé click o arrastrá tu logo
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "arca" && (
          <div className="space-y-6">
            {/* Electronic Invoicing Checklist */}
            <Card>
              <CardContent className="px-4">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CircleCheck className="size-4 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">
                      Facturación Electrónica
                    </h2>
                  </div>
                  <Badge variant="secondary">
                    {completedSteps}/{steps.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-lg border border-border bg-card"
                    >
                      <div
                        className="flex cursor-pointer items-center gap-3 px-4 py-2"
                        role="button"
                        aria-expanded={expandedStep === step.id}
                        tabIndex={0}
                        onClick={() =>
                          setExpandedStep(
                            expandedStep === step.id ? null : step.id,
                          )
                        }
                      >
                        <div className="mt-1 flex-shrink-0">
                          <Checkbox checked={step.completed} disabled />
                        </div>
                        <div className="flex-1">
                          <h4
                            className={`text-left text-sm font-medium text-foreground ${
                              step.completed ? "text-muted-foreground" : ""
                            }`}
                          >
                            {step.title}
                          </h4>
                        </div>
                        {step.expandable && (
                          <div className="mt-1 flex-shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                expandedStep === step.id ? "rotate-180" : ""
                              }`}
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {expandedStep === step.id && step.content && (
                        <div className="overflow-hidden">
                          <div>{step.content}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Closing Date Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-4 text-muted-foreground" />
                  Fecha de cierre
                </CardTitle>
                <CardDescription>
                  Los comprobantes anteriores a esta fecha no podrán ser
                  modificados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="closingDate">Fecha de cierre</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {closingDate ? (
                            format(closingDate, "PPP", { locale: es })
                          ) : (
                            <span className="text-muted-foreground">
                              Seleccionar fecha…
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={closingDate}
                          onSelect={setClosingDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Dejá vacío para no bloquear ninguna fecha
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled>
                      Guardar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Tax Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="size-4 text-muted-foreground" />
                  Configuración fiscal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form id="tax-settings-form">
                  <div className="rounded-lg border">
                    <div className="flex items-center justify-between border-b p-4">
                      <Label htmlFor="tax-settings-iibbIsExempt">
                        Exento de IIBB
                      </Label>
                      <Switch
                        id="tax-settings-iibbIsExempt"
                        checked={taxSettings.iibbIsExempt}
                        onCheckedChange={(checked) =>
                          setTaxSettings({
                            ...taxSettings,
                            iibbIsExempt: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between border-b p-4">
                      <Label htmlFor="tax-settings-isIvaPerceptionAgent">
                        Agente de percepción IVA
                      </Label>
                      <Switch
                        id="tax-settings-isIvaPerceptionAgent"
                        checked={taxSettings.isIvaPerceptionAgent}
                        onCheckedChange={(checked) =>
                          setTaxSettings({
                            ...taxSettings,
                            isIvaPerceptionAgent: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between border-b p-4">
                      <Label htmlFor="tax-settings-isIibbPerceptionAgent">
                        Agente de percepción IIBB
                      </Label>
                      <Switch
                        id="tax-settings-isIibbPerceptionAgent"
                        checked={taxSettings.isIibbPerceptionAgent}
                        onCheckedChange={(checked) =>
                          setTaxSettings({
                            ...taxSettings,
                            isIibbPerceptionAgent: checked,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <Label htmlFor="tax-settings-isRetentionAgent">
                        Agente de retención
                      </Label>
                      <Switch
                        id="tax-settings-isRetentionAgent"
                        checked={taxSettings.isRetentionAgent}
                        onCheckedChange={(checked) =>
                          setTaxSettings({
                            ...taxSettings,
                            isRetentionAgent: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button type="submit" form="tax-settings-form" disabled>
                      Guardar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* FCE Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  Factura de Crédito Electrónica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cbu">
                      CBU para Factura de Crédito Electrónica
                    </Label>
                    <Input
                      id="cbu"
                      maxLength={22}
                      placeholder="1234567890123456789012"
                      value={cbu}
                      onChange={(e) => setCbu(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ingresá un CBU para habilitar FCE MiPyME
                    </p>
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
        )}
      </div>

      {/* Fiscal Data Dialog */}
      <Dialog open={fiscalDialogOpen} onOpenChange={setFiscalDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="hidden">
            Ver datos fiscales
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Datos fiscales</DialogTitle>
            <DialogDescription>
              Podés actualizar la fecha de inicio de actividades y el número de
              IIBB. Si necesitás cambiar otros datos, contactanos.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6">
            <Card className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">CUIT</p>
                  <p className="font-medium">23-29607188-9</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Razón Social</p>
                  <p className="font-medium">GUSTAVO GIMENEZ</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Personería</p>
                  <p className="font-medium">Física</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Condición ante IVA
                  </p>
                  <p className="font-medium">Monotributista</p>
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">
                  Domicilio Fiscal
                </p>
                <div className="text-sm">
                  <p>Jorge Luis Borges 686</p>
                  <p>La Calera, Córdoba - CP: 5151</p>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activitiesStartedAt">
                  Inicio de actividades *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {format(activitiesStartedAt, "d 'de' MMMM 'de' yyyy", {
                        locale: es,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={activitiesStartedAt}
                      onSelect={(date) => date && setActivitiesStartedAt(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iibb">IIBB (opcional)</Label>
                <Input
                  id="iibb"
                  placeholder="Número de IIBB"
                  value={iibb}
                  onChange={(e) => setIibb(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFiscalDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
          <DialogClose className="absolute right-2 top-2">
            <Button variant="ghost" size="icon-sm">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Confirmation Delegation AlertDialog */}
      <AlertDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar delegación de facturación
            </AlertDialogTitle>
            <AlertDialogDescription>
              Antes de continuar, asegurate de haber delegado el web service de
              facturación electrónica en ARCA. Si no lo hiciste, seguí los pasos
              de la guía.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={delegationConfirmed}
                onCheckedChange={(checked) =>
                  setDelegationConfirmed(checked as boolean)
                }
              />
              <span className="text-sm">
                Confirmo que delegué la facturación electrónica en ARCA
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDelegationConfirmed(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction disabled={!delegationConfirmed}>
              Confirmar delegación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
