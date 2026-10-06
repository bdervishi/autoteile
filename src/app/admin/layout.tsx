import { AdminNavigation } from "@/components/admin-navigation";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-workspace">
      <AdminNavigation />
      <div className="admin-content">{children}</div>
    </div>
  );
}
