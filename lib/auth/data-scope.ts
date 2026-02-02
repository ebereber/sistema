export interface UserScope {
  visibility: "own" | "assigned_locations" | "all";
  userId: string;
  locationIds: string[];
}

interface SupabaseQuery {
  eq(column: string, value: string): this;
  in(column: string, values: string[]): this;
}

export function applyDataScope<T extends SupabaseQuery>(
  query: T,
  scope: UserScope,
  opts: {
    userColumn?: string;
    locationColumn?: string;
  } = {},
): T {
  const { userColumn = "user_id", locationColumn = "location_id" } = opts;

  switch (scope.visibility) {
    case "own":
      return query.eq(userColumn, scope.userId);
    case "assigned_locations":
      // Si no tiene ubicaciones asignadas, no mostrar nada
      if (scope.locationIds.length === 0) {
        return query.eq(locationColumn, "00000000-0000-0000-0000-000000000000");
      }
      return query.in(locationColumn, scope.locationIds);
    case "all":
      return query;
  }
}
