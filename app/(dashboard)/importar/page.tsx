"use client";

import {
  ArrowLeft,
  CircleAlert,
  FileDown,
  Loader2,
  Lock,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { importDataAction, parseFileAction } from "@/lib/actions/import";
import type { ParseResult } from "@/lib/import/parser";
import {
  TEMPLATES,
  TYPE_LABELS,
  type ImportType,
} from "@/lib/import/templates";

// ─── Config ───────────────────────────────────────────

interface ImportTypeConfig {
  id:
    | ImportType
    | "sales_totals"
    | "sales_products"
    | "collections"
    | "supplier_payments"
    | "kits";
  label: string;
  locked?: boolean;
  disabled?: boolean;
}

const importTypes: ImportTypeConfig[] = [
  { id: "products", label: "Productos" },
  { id: "stock", label: "Stock" },
  { id: "prices", label: "Precios" },
  { id: "customers", label: "Clientes" },
  { id: "suppliers", label: "Proveedores" },
  { id: "sales_totals", label: "Ventas (totales)", disabled: true },
  { id: "sales_products", label: "Ventas (con productos)", disabled: true },
  { id: "collections", label: "Cobranzas", disabled: true },
  { id: "supplier_payments", label: "Pagos a proveedores", disabled: true },
  { id: "kits", label: "Kits", locked: true },
];

const ACTIVE_TYPES = ["products", "stock", "prices", "customers", "suppliers"];

// ─── Main Content ─────────────────────────────────────

function ImportarPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tipo = searchParams.get("tipo") as ImportType | null;
  const step = searchParams.get("step");
  const dialogOpen = searchParams.get("dialogOpen") === "true";

  const [selectedType, setSelectedType] = React.useState<ImportType | null>(
    tipo,
  );
  const [isDialogOpen, setIsDialogOpen] = React.useState(dialogOpen);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(
    null,
  );
  const [isImporting, setIsImporting] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSelectedType(tipo);
    setIsDialogOpen(dialogOpen);
  }, [tipo, dialogOpen]);

  // ─── Handlers ──────────────────────────────────────

  const handleTypeClick = (
    type: string,
    locked?: boolean,
    disabled?: boolean,
  ) => {
    if (locked || disabled) return;
    if (!ACTIVE_TYPES.includes(type)) return;

    setSelectedType(type as ImportType);
    setIsDialogOpen(true);
    router.push(`/importar?tipo=${type}&dialogOpen=true`);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    router.push("/importar");
  };

  const handleDownloadTemplate = () => {
    if (!selectedType) return;
    // Direct download from API
    window.open(`/api/import/template/${selectedType}`, "_blank");
    setIsDialogOpen(false);
    router.push(`/importar?tipo=${selectedType}&step=2`);
  };

  const handleAlreadyHaveFile = () => {
    setIsDialogOpen(false);
    router.push(`/importar?tipo=${selectedType}&step=2`);
  };

  const processFile = async (file: File) => {
    if (!selectedType) return;

    setUploadedFile(file);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedType);

      const result = await parseFileAction(formData);
      setParseResult(result);

      if (result.totalRows === 0) {
        toast.error(
          "El archivo no contiene datos. Los datos deben empezar en la fila 4.",
        );
        return;
      }

      router.push(`/importar?tipo=${selectedType}&step=3`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al procesar el archivo",
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isParsing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isParsing) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      toast.error("Formato no soportado. Usá archivos .xlsx, .xls o .csv");
      return;
    }

    processFile(file);
  };

  const handleBack = () => {
    if (step === "2") {
      setUploadedFile(null);
      setParseResult(null);
      router.push("/importar");
    } else if (step === "3") {
      setUploadedFile(null);
      setParseResult(null);
      router.push(`/importar?tipo=${selectedType}&step=2`);
    }
  };

  const handleImport = async () => {
    if (!uploadedFile || !selectedType || !parseResult) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("type", selectedType);

      const { result, errorFileBase64 } = await importDataAction(formData);

      // Store result in sessionStorage for the results page
      sessionStorage.setItem(
        "importResult",
        JSON.stringify({
          ...result,
          errorFileBase64,
          importType: selectedType,
          totalRows: parseResult.totalRows,
        }),
      );

      router.push("/importar/terminado");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error durante la importación",
      );
      setIsImporting(false);
    }
  };

  const handleDownloadErrors = () => {
    // For step 3 parse errors preview
    if (!parseResult) return;
    const errorRows = parseResult.rows.filter((r) => r.errors.length > 0);
    if (errorRows.length === 0) return;

    toast.info(`${errorRows.length} fila(s) con errores de validación`);
  };

  // ─── Step 1: Type Selection ────────────────────────

  if (!step || step === "1") {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <h2 className="font-bold text-2xl tracking-tight">Importar Datos</h2>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descargar Plantilla</CardTitle>
              <CardDescription>
                Elegí el tipo de datos y descargá la plantilla con el formato
                correcto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {importTypes.map((type) => (
                      <div key={`${type.id}-${type.label}`} className="w-full">
                        {type.locked ? (
                          <Button
                            variant="outline"
                            size="default"
                            className="h-auto w-full justify-start p-4"
                            asChild
                          >
                            <Link href="/configuracion/plan">
                              <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                              {type.label}
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="default"
                            className={`h-auto w-full justify-start p-4 ${type.disabled ? "opacity-50" : ""}`}
                            onClick={() =>
                              handleTypeClick(
                                type.id,
                                type.locked,
                                type.disabled,
                              )
                            }
                            disabled={type.disabled}
                          >
                            {type.label}
                            {type.disabled && (
                              <Badge
                                variant="secondary"
                                className="ml-auto text-xs"
                              >
                                Próximamente
                              </Badge>
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Descargar plantilla de{" "}
                {selectedType && TYPE_LABELS[selectedType]}
              </DialogTitle>
              <DialogDescription>
                Descargá la plantilla Excel, completala con tus datos y luego
                subila para importar.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleAlreadyHaveFile}>
                Ya tengo mi archivo
              </Button>
              <Button onClick={handleDownloadTemplate}>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar Plantilla
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Step 2: Upload File ───────────────────────────

  if (step === "2") {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <h2 className="font-bold text-2xl tracking-tight">Importar Datos</h2>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Subir Archivo — {selectedType && TYPE_LABELS[selectedType]}
              </CardTitle>
              <CardDescription>Subí tu archivo completado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </Button>
                </div>

                <div
                  role="presentation"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`rounded-lg border-2 border-dashed bg-card p-6 text-center text-foreground transition-colors duration-300 ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-gray-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    accept="application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,.xls,.csv"
                    type="file"
                    className="sr-only"
                    id="file-upload"
                    onChange={handleFileUpload}
                    disabled={isParsing}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-y-2">
                      {isParsing ? (
                        <>
                          <Loader2
                            className="animate-spin text-muted-foreground"
                            size={20}
                          />
                          <p className="text-sm">Procesando archivo...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="text-muted-foreground" size={20} />
                          <p className="text-sm">Subir archivo</p>
                          <div className="flex flex-col items-center gap-y-1">
                            <p className="text-muted-foreground text-xs">
                              Arrastrá y soltá o{" "}
                              <span className="cursor-pointer underline transition hover:text-foreground">
                                seleccioná archivo
                              </span>{" "}
                              para subir
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Step 3: Confirm Data ──────────────────────────

  if (step === "3" && parseResult && selectedType) {
    const template = TEMPLATES[selectedType];
    const displayHeaders = template.columns.map((c) =>
      c.header.replace(" *", ""),
    );

    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <h2 className="font-bold text-2xl tracking-tight">Importar Datos</h2>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Confirmar Datos</CardTitle>
              <CardDescription>
                Revisá y confirmá los datos a importar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="flex items-center space-x-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Anterior</span>
                    </Button>
                    <Badge
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <FileDown className="h-3 w-3" />
                      <span>{uploadedFile?.name || "archivo.xlsx"}</span>
                    </Badge>
                    <Badge variant="outline">
                      {parseResult.totalRows} registro
                      {parseResult.totalRows !== 1 ? "s" : ""}
                    </Badge>
                    {parseResult.errorRows > 0 && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <CircleAlert className="h-3 w-3" />
                        {parseResult.errorRows} con errores
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {displayHeaders.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.rows.map((row, index) => (
                        <TableRow
                          key={row.rowNumber}
                          className={
                            row.errors.length > 0 ? "bg-destructive/5" : ""
                          }
                        >
                          <TableCell className="font-mono text-muted-foreground text-xs">
                            {index + 1}
                          </TableCell>
                          {displayHeaders.map((header) => (
                            <TableCell key={header}>
                              <div className="max-w-[200px] truncate text-sm">
                                {row.data[header] ?? (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          ))}
                          <TableCell>
                            {row.errors.length > 0 ? (
                              <span
                                className="cursor-help text-destructive text-xs"
                                title={row.errors.join("\n")}
                              >
                                {row.errors[0]}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-center pt-4">
                  <Button
                    size="lg"
                    className="w-full max-w-sm"
                    onClick={handleImport}
                    disabled={isImporting || parseResult.validRows === 0}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        Importar {parseResult.validRows} registro
                        {parseResult.validRows !== 1 ? "s" : ""}
                        {parseResult.errorRows > 0 &&
                          ` (${parseResult.errorRows} se omitirán)`}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

export default function ImportarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      }
    >
      <ImportarPageContent />
    </Suspense>
  );
}
