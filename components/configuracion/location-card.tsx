"use client";

import {
  Archive,
  Banknote,
  ChevronDown,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Location } from "@/lib/services/locations";
import { AssignPOSDialog } from "./assign-pos-dialog";
import { LocationSheet } from "./location-sheet";

interface LocationCardProps {
  location: Location;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSuccess: () => void;
}

export function LocationCard({
  location,
  onArchive,
  onDelete,
  onSuccess,
}: LocationCardProps) {
  const [posOpen, setPosOpen] = useState(true);
  const [colaboradoresOpen, setColaboradoresOpen] = useState(false);
  const [cajasOpen, setCajasOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const hasAssignedPOS =
    location.points_of_sale && location.points_of_sale.length > 0;

  function handleConfirmDelete() {
    onDelete(location.id);
    setDeleteDialogOpen(false);
  }

  function handleConfirmArchive() {
    onArchive(location.id);
    setArchiveDialogOpen(false);
  }

  return (
    <>
      <Card className="p-4 gap-4 px-0">
        <CardHeader className="flex flex-row items-center px-4 justify-between ">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">
              {location.name}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {location.is_main && (
              <Badge variant="secondary" className="text-xs">
                Principal
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <LocationSheet
                  mode="edit"
                  locationId={location.id}
                  onSuccess={onSuccess}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archivar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                  disabled={hasAssignedPOS}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          {/* {location.address && (
            <p className="text-sm text-muted-foreground mb-4">
              {location.address}
            </p>
          )} */}

          {/* Puntos de Venta Section */}
          <Collapsible open={posOpen} onOpenChange={setPosOpen}>
            <div className="rounded-lg border border-border">
              <CollapsibleTrigger asChild>
                <div className="flex px-4 justify-between py-2">
                  <Button
                    variant="ghost"
                    className=" flex items-center gap-2 p-0 h-auto hover:bg-transparent"
                  >
                    <div className="flex items-center  gap-2">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          posOpen ? "rotate-180" : ""
                        }`}
                      />
                      <Store className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Puntos de Venta
                      </span>
                      {location.points_of_sale &&
                        location.points_of_sale.length > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {location.points_of_sale.length}
                          </Badge>
                        )}
                    </div>
                  </Button>
                  <AssignPOSDialog
                    locationId={location.id}
                    locationName={location.name}
                    onSuccess={onSuccess}
                    trigger={
                      <Button variant="ghost" size="sm" className=" w-fit">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar
                      </Button>
                    }
                  />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {location.points_of_sale &&
                location.points_of_sale.length > 0 ? (
                  <div className="space-y-2 border-border border-t p-4">
                    {location.points_of_sale.map((pos) => (
                      <div
                        key={pos.id}
                        className="flex items-center justify-between py-2 px-3 "
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            #{pos.number}
                          </span>
                          <span className="text-sm">{pos.name}</span>
                        </div>
                        {pos.enabled_for_arca && (
                          <Badge variant="outline" className="text-xs">
                            ARCA
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm border-border border-t p-4 text-muted-foreground py-4">
                    No hay puntos de venta asignados
                  </p>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Colaboradores Section (Disabled) */}
          <Collapsible
            open={colaboradoresOpen}
            onOpenChange={setColaboradoresOpen}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg border border-border  px-4  py-2">
                    <CollapsibleTrigger asChild disabled>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-0  opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4" />
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Colaboradores
                          </span>
                          <Badge variant="secondary" className="ml-1">
                            0
                          </Badge>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Próximamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Collapsible>

          {/* Cajas Section (Disabled) */}
          <Collapsible open={cajasOpen} onOpenChange={setCajasOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="rounded-lg border border-border px-4  py-2">
                    <CollapsibleTrigger asChild disabled>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-0 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown className="h-4 w-4" />
                          <Banknote className="h-4 w-4" />
                          <span className="text-sm font-medium">Cajas</span>
                          <Badge variant="secondary" className="ml-1">
                            0
                          </Badge>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Próximamente</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              La ubicación <strong>{location.name}</strong> será archivada y no
              estará disponible para nuevas operaciones.
              {hasAssignedPOS && (
                <span className="block mt-2 text-amber-600">
                  Los puntos de venta asignados serán desvinculados
                  automáticamente.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ubicación?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasAssignedPOS ? (
                <>
                  No se puede eliminar la ubicación{" "}
                  <strong>{location.name}</strong> porque tiene puntos de venta
                  asignados. Primero reasigná o eliminá los puntos de venta.
                </>
              ) : (
                <>
                  Esta acción no se puede deshacer. La ubicación{" "}
                  <strong>{location.name}</strong> será eliminada
                  permanentemente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!hasAssignedPOS && (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
