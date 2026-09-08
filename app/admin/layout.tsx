import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <AdminNav />
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
