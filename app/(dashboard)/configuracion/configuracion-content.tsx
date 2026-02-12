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
import { saveArcaCredentialsAction } from "@/lib/actions/arca";
import {
  confirmDelegationAction,
  saveFiscalConfigAction,
  updateFiscalSettingsAction,
} from "@/lib/actions/fiscal";
import {
  updateOrganizationAction,
  uploadOrganizationLogoAction,
} from "@/lib/actions/organization";
import type { FiscalConfig, FiscalPointOfSale } from "@/lib/services/fiscal";
import type { Organization } from "@/lib/services/organization";
import type { PointOfSale } from "@/lib/services/point-of-sale";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  CircleCheck,
  CreditCard,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Receipt,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ConfiguracionContentProps {
  organization: Organization;
  fiscalConfig: FiscalConfig | null;
  fiscalPointsOfSale: FiscalPointOfSale[];
  pointsOfSale: PointOfSale[];
  hasArcaCredentials: boolean;
}

export function ConfiguracionContent({
  organization,
  fiscalConfig,
  fiscalPointsOfSale,
  pointsOfSale,
  hasArcaCredentials,
}: ConfiguracionContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const [activeTab, setActiveTab] = useState(currentTab);

  // --- General tab ---
  const [generalForm, setGeneralForm] = useState({
    name: organization.name,
    email: organization.email || "",
    phone: organization.phone || "",
  });
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || "");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ARCA tab ---
  const [fiscalDialogOpen, setFiscalDialogOpen] = useState(false);
  const [isSavingFiscal, setIsSavingFiscal] = useState(false);

  // Fiscal dialog form state
  const hasFiscalData = !!fiscalConfig?.razon_social;
  const [fiscalForm, setFiscalForm] = useState({
    cuit: fiscalConfig?.cuit || organization.cuit || "",
    razon_social: fiscalConfig?.razon_social || "",
    condicion_iva: fiscalConfig?.condicion_iva || "Monotributista",
    personeria: fiscalConfig?.personeria || "Física",
    domicilio_fiscal: fiscalConfig?.domicilio_fiscal || "",
    localidad: fiscalConfig?.localidad || "",
    provincia: fiscalConfig?.provincia || "",
    codigo_postal: fiscalConfig?.codigo_postal || "",
    inicio_actividades: fiscalConfig?.inicio_actividades || "",
    iibb: fiscalConfig?.iibb || "",
  });

  // Fiscal settings
  const [closingDate, setClosingDate] = useState<Date | undefined>(
    fiscalConfig?.fecha_cierre
      ? new Date(fiscalConfig.fecha_cierre)
      : undefined,
  );
  const [taxSettings, setTaxSettings] = useState({
    iibbIsExempt: fiscalConfig?.iibb_exento ?? false,
    isIvaPerceptionAgent: fiscalConfig?.es_agente_percepcion_iva ?? false,
    isIibbPerceptionAgent: fiscalConfig?.es_agente_percepcion_iibb ?? false,
    isRetentionAgent: fiscalConfig?.es_agente_retencion ?? false,
  });
  const [cbu, setCbu] = useState(fiscalConfig?.cbu_fce || "");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingClosingDate, setIsSavingClosingDate] = useState(false);
  const [isSavingCbu, setIsSavingCbu] = useState(false);

  // Delegation
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [delegationCheckbox, setDelegationCheckbox] = useState(false);
  const [isConfirmingDelegation, setIsConfirmingDelegation] = useState(false);
  const isDelegationConfirmed = fiscalConfig?.delegacion_confirmada ?? false;

  // Certificate upload
  const [isSavingCerts, setIsSavingCerts] = useState(false);
  const [certsUploaded, setCertsUploaded] = useState(hasArcaCredentials);
  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [certFileName, setCertFileName] = useState<string | null>(null);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const [certContent, setCertContent] = useState<string | null>(null);
  const [keyContent, setKeyContent] = useState<string | null>(null);

  // Checklist state
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // --- Handlers ---

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "arca") {
      router.push("/configuracion?tab=arca");
    } else {
      router.push("/configuracion");
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalForm.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    setIsSavingGeneral(true);
    try {
      await updateOrganizationAction({
        name: generalForm.name.trim(),
        email: generalForm.email.trim() || null,
        phone: generalForm.phone.trim() || null,
      });
      toast.success("Datos actualizados");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      toast.error("El archivo excede 512KB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadOrganizationLogoAction(formData);
      setLogoUrl(url);
      toast.success("Logo actualizado");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al subir el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !fiscalForm.cuit ||
      !fiscalForm.razon_social ||
      !fiscalForm.condicion_iva
    ) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    setIsSavingFiscal(true);
    try {
      await saveFiscalConfigAction({
        cuit: fiscalForm.cuit,
        razon_social: fiscalForm.razon_social,
        condicion_iva: fiscalForm.condicion_iva,
        personeria: fiscalForm.personeria || null,
        domicilio_fiscal: fiscalForm.domicilio_fiscal || null,
        localidad: fiscalForm.localidad || null,
        provincia: fiscalForm.provincia || null,
        codigo_postal: fiscalForm.codigo_postal || null,
        inicio_actividades: fiscalForm.inicio_actividades || null,
        iibb: fiscalForm.iibb || null,
      });
      toast.success("Datos fiscales guardados");
      setFiscalDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar datos fiscales");
    } finally {
      setIsSavingFiscal(false);
    }
  };

  const handleMarkDelegationDone = async () => {
    try {
      await updateFiscalSettingsAction({ delegacion_web_service: true });
      toast.success("Marcado como completado");
      router.refresh();
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  const handleConfirmDelegation = async () => {
    setIsConfirmingDelegation(true);
    try {
      await confirmDelegationAction();
      toast.success("Delegación confirmada");
      setConfirmationDialogOpen(false);
      setDelegationCheckbox(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al confirmar delegación");
    } finally {
      setIsConfirmingDelegation(false);
    }
  };

  const handleSaveTaxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateFiscalSettingsAction({
        iibb_exento: taxSettings.iibbIsExempt,
        es_agente_percepcion_iva: taxSettings.isIvaPerceptionAgent,
        es_agente_percepcion_iibb: taxSettings.isIibbPerceptionAgent,
        es_agente_retencion: taxSettings.isRetentionAgent,
      });
      toast.success("Configuración fiscal actualizada");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveClosingDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClosingDate(true);
    try {
      await updateFiscalSettingsAction({
        fecha_cierre: closingDate
          ? closingDate.toISOString().split("T")[0]
          : null,
      });
      toast.success("Fecha de cierre actualizada");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSavingClosingDate(false);
    }
  };

  const handleSaveCbu = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCbu(true);
    try {
      await updateFiscalSettingsAction({
        cbu_fce: cbu.trim() || null,
      });
      toast.success("CBU actualizado");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setIsSavingCbu(false);
    }
  };

  const handleFileRead = (
    file: File,
    setContent: (v: string) => void,
    setName: (v: string) => void,
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target?.result as string);
      setName(file.name);
    };
    reader.readAsText(file);
  };

  const handleUploadCertificates = async () => {
    if (!certContent || !keyContent) {
      toast.error("Seleccioná ambos archivos (certificado y clave privada)");
      return;
    }
    setIsSavingCerts(true);
    try {
      await saveArcaCredentialsAction(certContent, keyContent);
      setCertsUploaded(true);
      toast.success("Certificados guardados");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar certificados");
    } finally {
      setIsSavingCerts(false);
    }
  };

  // --- Checklist completion ---
  const step1Completed = hasFiscalData;
  const step2Completed = fiscalConfig?.delegacion_web_service ?? false;
  const step3Completed = isDelegationConfirmed;
  const step4Completed = certsUploaded;
  const step5Completed = fiscalConfig?.punto_venta_creado_arca ?? false;
  const step6Completed = pointsOfSale.some((pos) => pos.enabled_for_arca);

  const steps = [
    {
      id: 1,
      title: "Completá tus datos fiscales",
      completed: step1Completed,
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
              {hasFiscalData ? "Ver datos fiscales" : "Ingresar datos fiscales"}
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Delegá la facturación electrónica",
      completed: step2Completed,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Delegá el web service de facturación electrónica para habilitar que
            La Pyme facture por vos desde ARCA.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button
              variant="secondary"
              disabled={step2Completed || !step1Completed}
              onClick={() =>
                updateFiscalSettingsAction({
                  delegacion_web_service: true,
                }).then(() => router.refresh())
              }
            >
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
      completed: step3Completed,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Confirmá la delegación de facturación electrónica con ARCA para
            habilitar la emisión de comprobantes fiscales desde La Pyme.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            {step3Completed ? (
              <Button variant="secondary" disabled>
                Delegación confirmada
              </Button>
            ) : (
              <Button onClick={() => setConfirmationDialogOpen(true)}>
                Confirmar delegación
              </Button>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: "Cargá tus certificados ARCA",
      completed: step4Completed,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Subí el certificado (.crt) y la clave privada (.key) que generaste
            para tu CUIT. Estos archivos se usan para firmar los comprobantes.
          </p>
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex-1">
                <input
                  ref={certInputRef}
                  type="file"
                  accept=".crt,.pem,.cer"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      handleFileRead(file, setCertContent, setCertFileName);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => certInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {certFileName ?? "Certificado (.crt)"}
                </Button>
              </div>
              <div className="flex-1">
                <input
                  ref={keyInputRef}
                  type="file"
                  accept=".key,.pem"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      handleFileRead(file, setKeyContent, setKeyFileName);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => keyInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {keyFileName ?? "Clave privada (.key)"}
                </Button>
              </div>
            </div>
            <div>
              <Button
                disabled={
                  isSavingCerts ||
                  certsUploaded ||
                  !certContent ||
                  !keyContent
                }
                onClick={handleUploadCertificates}
              >
                {isSavingCerts && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {certsUploaded
                  ? "Certificados cargados"
                  : "Guardar certificados"}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: "Creá un punto de venta con facturación electrónica en ARCA",
      completed: step5Completed,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            El punto de venta es un código de 4 dígitos. Usá un punto de venta
            por sucursal. Si ya tenés un punto de venta válido, podés continuar
            al siguiente paso.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Button
              variant="secondary"
              disabled={step5Completed || !step4Completed}
              onClick={() =>
                updateFiscalSettingsAction({
                  punto_venta_creado_arca: true,
                }).then(() => router.refresh())
              }
            >
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
      id: 6,
      title: "Creá tu punto de venta en La Pyme",
      completed: step6Completed,
      expandable: true,
      content: (
        <div className="-mt-1 space-y-3 pb-4 pl-11 pr-6">
          <p className="max-w-xl text-sm text-muted-foreground">
            Completá con el número y nombre del punto de venta que creaste en
            ARCA.
          </p>
          <div className="flex flex-col gap-2 pt-1 md:flex-row">
            <Link href="/configuracion/puntos-de-venta">
              <Button>
                <span className="inline-flex items-center gap-1">
                  {step6Completed
                    ? "Ver puntos de venta"
                    : "Crear punto de venta"}
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

  const generalFormChanged =
    generalForm.name !== organization.name ||
    generalForm.email !== (organization.email || "") ||
    generalForm.phone !== (organization.phone || "");

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
                  para los clientes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveGeneral} className="space-y-4">
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
                    <Button
                      type="submit"
                      disabled={isSavingGeneral || !generalFormChanged}
                    >
                      {isSavingGeneral && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        fileInputRef.current?.click();
                    }}
                    className="relative h-full w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 bg-card text-center text-foreground transition-colors duration-300 hover:border-primary/50"
                  >
                    <input
                      ref={fileInputRef}
                      accept="image/jpeg,image/png"
                      tabIndex={-1}
                      type="file"
                      onChange={handleLogoUpload}
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
                    {isUploadingLogo ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : logoUrl ? (
                      <div className="relative h-full w-full overflow-hidden rounded-lg">
                        <Image
                          src={logoUrl}
                          alt="Logo"
                          fill
                          className="object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="cursor-pointer text-sm text-muted-foreground">
                          Hacé click o arrastrá tu logo
                        </p>
                      </div>
                    )}
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
                <form onSubmit={handleSaveClosingDate} className="space-y-4">
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
                    <Button
                      type="submit"
                      disabled={!fiscalConfig || isSavingClosingDate}
                    >
                      {isSavingClosingDate && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
                <form id="tax-settings-form" onSubmit={handleSaveTaxSettings}>
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
                    <Button
                      type="submit"
                      form="tax-settings-form"
                      disabled={!fiscalConfig || isSavingSettings}
                    >
                      {isSavingSettings && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
                <form onSubmit={handleSaveCbu} className="space-y-4">
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
                    <Button
                      type="submit"
                      disabled={!fiscalConfig || isSavingCbu}
                    >
                      {isSavingCbu && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
              {hasFiscalData
                ? "Podés actualizar la fecha de inicio de actividades y el número de IIBB. Si necesitás cambiar otros datos, contactanos."
                : "Ingresá los datos fiscales de tu organización."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFiscal} className="space-y-6">
            {hasFiscalData ? (
              /* Read-only display for existing fiscal data */
              <Card className="p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">CUIT</p>
                    <p className="font-medium">{fiscalConfig!.cuit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Razón Social
                    </p>
                    <p className="font-medium">{fiscalConfig!.razon_social}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Personería</p>
                    <p className="font-medium">
                      {fiscalConfig!.personeria || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Condición ante IVA
                    </p>
                    <p className="font-medium">{fiscalConfig!.condicion_iva}</p>
                  </div>
                </div>
                {fiscalConfig!.domicilio_fiscal && (
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Domicilio Fiscal
                    </p>
                    <div className="text-sm">
                      <p>{fiscalConfig!.domicilio_fiscal}</p>
                      {(fiscalConfig!.localidad || fiscalConfig!.provincia) && (
                        <p>
                          {[fiscalConfig!.localidad, fiscalConfig!.provincia]
                            .filter(Boolean)
                            .join(", ")}
                          {fiscalConfig!.codigo_postal &&
                            ` - CP: ${fiscalConfig!.codigo_postal}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              /* Editable form for new fiscal data */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CUIT *</Label>
                    <Input
                      value={fiscalForm.cuit}
                      onChange={(e) =>
                        setFiscalForm({ ...fiscalForm, cuit: e.target.value })
                      }
                      placeholder="20123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Razón Social *</Label>
                    <Input
                      value={fiscalForm.razon_social}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          razon_social: e.target.value,
                        })
                      }
                      placeholder="NOMBRE APELLIDO"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Condición ante IVA *</Label>
                    <Input
                      value={fiscalForm.condicion_iva}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          condicion_iva: e.target.value,
                        })
                      }
                      placeholder="Monotributista"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Personería</Label>
                    <Input
                      value={fiscalForm.personeria}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          personeria: e.target.value,
                        })
                      }
                      placeholder="Física"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Domicilio Fiscal</Label>
                  <Input
                    value={fiscalForm.domicilio_fiscal}
                    onChange={(e) =>
                      setFiscalForm({
                        ...fiscalForm,
                        domicilio_fiscal: e.target.value,
                      })
                    }
                    placeholder="Calle 123"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Localidad</Label>
                    <Input
                      value={fiscalForm.localidad}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          localidad: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provincia</Label>
                    <Input
                      value={fiscalForm.provincia}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          provincia: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código Postal</Label>
                    <Input
                      value={fiscalForm.codigo_postal}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          codigo_postal: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="activitiesStartedAt">
                  Inicio de actividades
                </Label>
                <Input
                  type="date"
                  value={fiscalForm.inicio_actividades}
                  onChange={(e) =>
                    setFiscalForm({
                      ...fiscalForm,
                      inicio_actividades: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iibb">IIBB (opcional)</Label>
                <Input
                  id="iibb"
                  placeholder="Número de IIBB"
                  value={fiscalForm.iibb}
                  onChange={(e) =>
                    setFiscalForm({ ...fiscalForm, iibb: e.target.value })
                  }
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
              <Button type="submit" disabled={isSavingFiscal}>
                {isSavingFiscal && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
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
                checked={delegationCheckbox}
                onCheckedChange={(checked) =>
                  setDelegationCheckbox(checked as boolean)
                }
              />
              <span className="text-sm">
                Confirmo que delegué la facturación electrónica en ARCA
              </span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDelegationCheckbox(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!delegationCheckbox || isConfirmingDelegation}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelegation();
              }}
            >
              {isConfirmingDelegation && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar delegación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
