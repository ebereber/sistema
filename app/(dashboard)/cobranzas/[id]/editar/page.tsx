import { requirePermission } from "@/lib/auth/check-permission";

export default async function EditarCobranzaPage() {
  await requirePermission("sales:read");
  return <div>page</div>;
}
