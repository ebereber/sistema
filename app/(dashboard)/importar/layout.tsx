import { requirePermission } from "@/lib/auth/check-permission";

export default async function ImportarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("import:write");
  return children;
}
