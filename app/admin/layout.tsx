import { connection } from "next/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminExternalLinks } from "@/lib/admin-external-links";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const externalLinks = getAdminExternalLinks();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminNav externalLinks={externalLinks} />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
