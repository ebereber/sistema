"use client";

import { CircleCheck, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TYPE_LABELS, type ImportType } from "@/lib/import/templates";

// ─── Types ────────────────────────────────────────────

interface StoredImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    rowNumber: number;
    data: Record<string, string | number | null>;
    error: string;
  }>;
  errorFileBase64?: string;
  importType: ImportType;
  totalRows: number;
}

// ─── Content ──────────────────────────────────────────

function ImportarTerminadoContent() {
  const router = useRouter();

  const [result, setResult] = React.useState<StoredImportResult | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [phase, setPhase] = React.useState<"loading" | "done">("loading");

  React.useEffect(() => {
    const stored = sessionStorage.getItem("importResult");
    if (!stored) {
      router.push("/importar");
      return;
    }

    const parsed = JSON.parse(stored) as StoredImportResult;

    // Simulate brief progress animation
    const steps = [
      { progress: 40, delay: 300 },
      { progress: 75, delay: 600 },
      { progress: 100, delay: 900 },
    ];

    steps.forEach(({ progress: p, delay }) => {
      setTimeout(() => setProgress(p), delay);
    });

    setTimeout(() => {
      setResult(parsed);
      setPhase("done");
      sessionStorage.removeItem("importResult");
    }, 1200);
  }, [router]);

  const handleNewImport = () => {
    router.push("/importar");
  };

  const handleDownloadErrors = () => {
    if (!result?.errorFileBase64) return;

    const byteArray = Uint8Array.from(atob(result.errorFileBase64), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `errores-importacion-${result.importType}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Loading State ─────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex h-full flex-1 flex-col space-y-8 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-2xl tracking-tight">
            Estado de Importación
          </h2>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>En progreso</span>
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Procesando importación...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-center text-muted-foreground text-sm">
                Esto puede tardar unos segundos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── No Result ─────────────────────────────────────

  if (!result) return null;

  // ─── Results ───────────────────────────────────────

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl tracking-tight">
          Estado de Importación
        </h2>
        <Badge variant="default" className="flex items-center gap-2">
          <CircleCheck className="h-5 w-5" />
          <span className="ml-2">Completada</span>
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            Listo! — {TYPE_LABELS[result.importType]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="font-bold text-2xl">{result.created}</div>
                <div className="text-muted-foreground text-sm">Creados</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="font-bold text-2xl text-green-600">
                  {result.updated}
                </div>
                <div className="text-muted-foreground text-sm">
                  Actualizados
                </div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div
                  className={`font-bold text-2xl ${result.failed > 0 ? "text-destructive" : ""}`}
                >
                  {result.failed}
                </div>
                <div className="text-muted-foreground text-sm">Fallidos</div>
              </div>
            </div>
          </div>

          {/* Error details */}
          {result.failed > 0 && result.errors.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <h4 className="mb-2 font-medium text-destructive text-sm">
                  Errores ({result.errors.length})
                </h4>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {result.errors.slice(0, 20).map((err, index) => (
                    <p
                      key={err.rowNumber}
                      className="text-muted-foreground text-xs"
                    >
                      <span className="font-mono">Fila {index + 1}:</span>{" "}
                      {err.error}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-muted-foreground text-xs">
                      ...y {result.errors.length - 20} errores más
                    </p>
                  )}
                </div>
              </div>

              {result.errorFileBase64 && (
                <Button variant="outline" onClick={handleDownloadErrors}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar archivo de errores
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={handleNewImport}>
          Nueva importación
        </Button>
      </div>
    </div>
  );
}

export default function ImportarTerminadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 items-center justify-center">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      }
    >
      <ImportarTerminadoContent />
    </Suspense>
  );
}
