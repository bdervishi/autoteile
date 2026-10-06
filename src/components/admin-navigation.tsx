"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  List,
  ChartNoAxesCombined,
  Handshake,
  ShieldCheck,
  Settings,
} from "lucide-react";
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar">
      <p className="eyebrow">VERWALTUNG</p>
      <nav aria-label="Adminnavigation">
        {[
          { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
          { href: "/admin/crm", label: "CRM & Kontakte", Icon: Users },
          { href: "/admin/inserate", label: "Inserateübersicht", Icon: List },
          {
            href: "/admin/statistik",
            label: "Statistik",
            Icon: ChartNoAxesCombined,
          },
          { href: "/admin/umsatz", label: "Partneranfragen", Icon: Handshake },
          { href: "/admin#meldungen", label: "Moderation", Icon: ShieldCheck },
          {
            href: "/admin#einstellungen",
            label: "Einstellungen",
            Icon: Settings,
          },
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <Link href="/teile" className="admin-market-link">
        Zum Marktplatz →
      </Link>
    </aside>
  );
}
