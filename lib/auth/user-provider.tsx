// lib/auth/user-provider.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  role: {
    id: string;
    name: string;
    is_system: boolean;
    permissions: string[];
    special_actions: string[];
  } | null;
}

interface UserContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  permissions: string[];
  specialActions: string[];
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  permissions: [],
  specialActions: [],
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setIsLoading(false);
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, email, name, active, role:roles!users_role_id_fkey(id, name, is_system, permissions, special_actions)",
        )
        .eq("id", authUser.id)
        .single();

      if (error || !data) {
        setIsLoading(false);
        router.push("/login");
        return;
      }

      if (!data.active) {
        setIsLoading(false);
        router.push("/acceso-pendiente");
        return;
      }

      const role = data.role as CurrentUser["role"];

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        active: data.active ?? true,
        role: role
          ? {
              ...role,
              permissions: (role.permissions as string[]) || [],
              special_actions: (role.special_actions as string[]) || [],
            }
          : null,
      });
      setIsLoading(false);
    }

    loadUser();
  }, [router]);

  const permissions = user?.role?.permissions || [];
  const specialActions = user?.role?.special_actions || [];

  return (
    <UserContext.Provider
      value={{ user, isLoading, permissions, specialActions }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
