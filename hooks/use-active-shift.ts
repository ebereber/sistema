"use client";

import {
  addCashToShift,
  closeShift,
  getActiveShift,
  getShiftSummary,
  openShift,
  removeCashFromShift,
  type Shift,
  type ShiftSummary,
} from "@/lib/services/shifts";
import { useCallback, useEffect, useState } from "react";

interface UseActiveShiftReturn {
  shift: Shift | null;
  summary: ShiftSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  openNewShift: (
    cashRegisterId: string,
    openingAmount: number,
  ) => Promise<void>;
  closeCurrentShift: (
    countedAmount: number,
    leftInCash: number,
    discrepancyReason?: string,
    discrepancyNotes?: string,
  ) => Promise<void>;
  addCash: (amount: number, notes?: string) => Promise<void>;
  removeCash: (amount: number, notes?: string) => Promise<void>;
}

export function useActiveShift(): UseActiveShiftReturn {
  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShift = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const activeShift = await getActiveShift();
      setShift(activeShift);

      if (activeShift) {
        const shiftSummary = await getShiftSummary(activeShift.id);
        setSummary(shiftSummary);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error("Error fetching shift:", err);
      setError(err instanceof Error ? err.message : "Error al cargar turno");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShift();
  }, [fetchShift]);

  const openNewShift = useCallback(
    async (cashRegisterId: string, openingAmount: number) => {
      const newShift = await openShift({
        cashRegisterId,
        openingAmount,
      });
      setShift(newShift);
      setSummary({
        grossCollections: 0,
        refunds: 0,
        netCollections: 0,
        cashIn: 0,
        cashOut: 0,
        currentCashAmount: openingAmount,
      });
    },
    [],
  );

  const closeCurrentShift = useCallback(
    async (
      countedAmount: number,
      leftInCash: number,
      discrepancyReason?: string,
      discrepancyNotes?: string,
    ) => {
      if (!shift) throw new Error("No hay turno activo");

      await closeShift(shift.id, {
        countedAmount,
        leftInCash,
        discrepancyReason,
        discrepancyNotes,
      });

      setShift(null);
      setSummary(null);
    },
    [shift],
  );

  const addCash = useCallback(
    async (amount: number, notes?: string) => {
      if (!shift) throw new Error("No hay turno activo");

      await addCashToShift(shift.id, amount, notes);
      await fetchShift(); // Refetch to update summary
    },
    [shift, fetchShift],
  );

  const removeCash = useCallback(
    async (amount: number, notes?: string) => {
      if (!shift) throw new Error("No hay turno activo");

      await removeCashFromShift(shift.id, amount, notes);
      await fetchShift(); // Refetch to update summary
    },
    [shift, fetchShift],
  );

  return {
    shift,
    summary,
    isLoading,
    error,
    refetch: fetchShift,
    openNewShift,
    closeCurrentShift,
    addCash,
    removeCash,
  };
}
