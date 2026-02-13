import { requirePermission } from "@/lib/auth/check-permission";

export default async function EditarPagoPage() {
  await requirePermission("purchases:read");
  return null;
}
