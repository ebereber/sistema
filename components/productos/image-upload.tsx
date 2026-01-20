"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  deleteProductImage,
  uploadProductImage,
} from "@/lib/services/products";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo es muy grande", {
          description: "El tamaño máximo es 5MB",
        });
        return;
      }

      setIsUploading(true);

      try {
        // Delete old image if exists
        if (value) {
          try {
            await deleteProductImage(value);
          } catch {
            // Ignore delete errors
          }
        }

        const url = await uploadProductImage(file);
        onChange(url);
        toast.success("Imagen subida correctamente");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error("Error al subir la imagen", { description: errorMessage });
      } finally {
        setIsUploading(false);
      }
    },
    [value, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();

    if (!value) return;

    setIsUploading(true);

    try {
      await deleteProductImage(value);
      onChange(null);
      toast.success("Imagen eliminada");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al eliminar la imagen", { description: errorMessage });
    } finally {
      setIsUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
        <Image
          src={value}
          alt="Imagen del producto"
          fill
          className="object-cover"
        />
        {!disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={handleRemove}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        flex aspect-square w-full cursor-pointer flex-col items-center justify-center
        rounded-lg border-2 border-dashed transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
        ${disabled ? "cursor-not-allowed opacity-50" : ""}
      `}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      ) : (
        <>
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground text-center px-4">
            {isDragActive
              ? "Soltá la imagen aquí"
              : "Hacé click o arrastrá tu imagen"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG, WEBP (máx. 5MB)
          </p>
        </>
      )}
    </div>
  );
}
