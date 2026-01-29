"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  onUpload,
  accept = "image/*,.pdf",
  maxSize = 5,
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`El archivo no puede superar ${maxSize}MB`);
        return;
      }

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Solo se permiten imágenes (JPG, PNG, WEBP) o PDF");
        return;
      }

      setIsUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
      } catch (err) {
        console.error("Error uploading file:", err);
        setError("Error al subir el archivo");
      } finally {
        setIsUploading(false);
      }
    },
    [maxSize, onChange, onUpload],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile],
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setError(null);
  }, [onChange]);

  const getFileIcon = (url: string) => {
    if (url.toLowerCase().endsWith(".pdf")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileName = (url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  // Show uploaded file
  if (value) {
    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          {getFileIcon(value)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getFileName(value)}</p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Ver archivo
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-300",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 bg-card hover:border-gray-400",
          isUploading && "pointer-events-none opacity-50",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isUploading}
        />
        <div className="flex flex-col items-center gap-y-2">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" />
          )}
          <p className="text-sm">
            {isUploading ? "Subiendo..." : "Subir archivo"}
          </p>
          <p className="text-xs text-muted-foreground">
            Arrastrá y soltá o{" "}
            <span className="cursor-pointer underline transition hover:text-foreground">
              seleccioná archivo
            </span>
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500">{error}</p>
      )}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Subí el PDF o imagen del comprobante. Máximo {maxSize}MB.
      </p>
    </div>
  );
}
