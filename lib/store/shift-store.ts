import { create } from "zustand";

import type { Shift, ShiftSummary } from "@/lib/services/shifts";

interface ShiftState {
  shift: Shift | null;
  summary: ShiftSummary | null;
  isLoading: boolean;

  setShift: (shift: Shift | null) => void;
  setSummary: (summary: ShiftSummary | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearShift: () => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  shift: null,
  summary: null,
  isLoading: true,

  setShift: (shift) => set({ shift }),
  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),
  clearShift: () => set({ shift: null, summary: null }),
}));
