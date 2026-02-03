// hooks/use-user-cash-registers.ts
"use client";

import { useCurrentUser } from "@/lib/auth/user-provider";
import {
  getCashRegisters,
  getCashRegistersByLocationIds,
  type CashRegister,
} from "@/lib/services/cash-registers";
import { useEffect, useRef, useState } from "react";
// hooks/use-user-cash-registers.ts

export function useUserCashRegisters(
  onLoaded?: (registers: CashRegister[]) => void,
) {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    async function load() {
      if (isUserLoading || !user) return;

      setIsLoading(true);
      try {
        let registers: CashRegister[];

        if (user.dataVisibilityScope === "all") {
          registers = await getCashRegisters();
        } else if (user.locationIds && user.locationIds.length > 0) {
          registers = await getCashRegistersByLocationIds(user.locationIds);
        } else {
          registers = [];
        }

        setCashRegisters(registers);
        onLoadedRef.current?.(registers);
      } catch (error) {
        console.error("Error loading cash registers:", error);
        setCashRegisters([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [user, isUserLoading]);

  return { cashRegisters, isLoading };
}
