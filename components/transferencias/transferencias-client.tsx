"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CirclePlus,
  Download,
  Ellipsis,
  Eye,
  PackageCheck,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTransferPdf } from "@/lib/pdf/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────

interface TransferItem {
  id: string;
  product_id: string;
  quantity: number;
  quantity_received: number;
  product: { name: string };
}

interface Transfer {
  id: string;
  transfer_number: string;
  status: string;
  transfer_date: string;
  created_at: string;
  source_location: { id: string; name: string };
  destination_location: { id: string; name: string };
  items: TransferItem[];
}

interface TransfersData {
  transfers: Transfer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const statusLabels: Record<string, string> = {
  in_transit: "En tránsito",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusVariants: Record<string, "secondary" | "default" | "destructive"> =
  {
    in_transit: "secondary",
    completed: "default",
    cancelled: "destructive",
  };

// ─── Component ────────────────────────────────────────

interface TransferenciasClientProps {
  data: TransfersData;
}

export function TransferenciasClient({ data }: TransferenciasClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get("status")?.split(",") || [],
  );
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset page when filters change
    if (!("page" in updates)) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleStatus = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    setSelectedStatuses(newStatuses);
    updateSearchParams({
      status: newStatuses.length > 0 ? newStatuses.join(",") : null,
    });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    // Debounce could be added here
    updateSearchParams({ search: value || null });
  };

  const goToPage = (page: number) => {
    updateSearchParams({ page: page > 1 ? page.toString() : null });
  };

  return (
    <div className="flex h-full flex-1 flex-col space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Transferencias</h2>
        <Button
          asChild
          size="default"
          variant="default"
          className="h-8 gap-1.5 px-2.5"
        >
          <Link href="/transferencias/nueva">
            <Plus className="size-4" />
            <span className="hidden md:inline">Nueva </span>
            Transferencia
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transferencias…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 w-full pl-8 sm:w-[150px] lg:w-[250px]"
            />
          </div>

          <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="h-8 justify-start border-dashed"
              >
                <CirclePlus className="mr-2 h-4 w-4" />
                Estado
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Estado" />
                <CommandList>
                  <CommandGroup>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <CommandItem
                        key={value}
                        onSelect={() => toggleStatus(value)}
                      >
                        <div className="flex size-4 items-center justify-center rounded-[4px] border border-input">
                          {selectedStatuses.includes(value) && (
                            <Check className="size-3.5" />
                          )}
                        </div>
                        <span className="ml-2">{label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.transfers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No hay transferencias
                  </TableCell>
                </TableRow>
              ) : (
                data.transfers.map((transfer) => {
                  const firstProduct = transfer.items[0]?.product?.name;
                  const productCount = transfer.items.length;

                  return (
                    <TableRow
                      key={transfer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/transferencias/${transfer.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(transfer.transfer_date), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{transfer.source_location.name}</TableCell>
                      <TableCell>
                        {transfer.destination_location.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {productCount} producto
                          {productCount !== 1 ? "s" : ""}
                        </div>
                        {firstProduct && (
                          <div className="text-xs text-muted-foreground">
                            {firstProduct}
                            {productCount > 1 && ` y ${productCount - 1} más`}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[transfer.status]}>
                          {statusLabels[transfer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 data-[state=open]:bg-accent"
                            >
                              <Ellipsis className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Button
                                variant="ghost"
                                size="default"
                                className="h-8"
                                onClick={() =>
                                  downloadTransferPdf(
                                    transfer.id,
                                    `remito-${transfer.transfer_number}.pdf`,
                                  )
                                }
                              >
                                <Download className="size-4" />
                                Descargar remito
                              </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/transferencias/${transfer.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            {transfer.status === "in_transit" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/transferencias/${transfer.id}/recibir`}
                                  >
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                    Recibir
                                  </Link>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2">
          <div className="hidden flex-1 text-sm text-muted-foreground md:block">
            Mostrando {data.transfers.length} de {data.total} resultados
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex w-[150px] items-center justify-center text-sm font-medium">
              Página {data.page} de {data.totalPages || 1}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              disabled={data.page <= 1}
              onClick={() => goToPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={data.page <= 1}
              onClick={() => goToPage(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={data.page >= data.totalPages}
              onClick={() => goToPage(data.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden h-8 w-8 lg:flex"
              disabled={data.page >= data.totalPages}
              onClick={() => goToPage(data.totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
