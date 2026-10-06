import Link from "next/link";
import { adminAccess } from "@/lib/server/admin-access";
import { AdminStatistics } from "@/components/admin-statistics";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Statistik",
  robots: { index: false, follow: false },
};
export default async function Statistics({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { allowed, preview } = await adminAccess(true);
  if (!allowed)
    return (
      <main id="main" className="container">
        <h1>Statistik</h1>
        <p>Administratorrechte erforderlich.</p>
        <Link href="/admin">Anmelden</Link>
      </main>
    );
  const p = await searchParams;
  const days = [7, 30, 90].includes(Number(p.tage)) ? Number(p.tage) : 30;
  return (
    <main id="main" className="container">
      <p className="eyebrow">ENTWICKLUNG VERSTEHEN</p>
      <h1>Statistik</h1>
      <p>Marktplatzbestand, neue Inserate und offene Aufgaben.</p>
      {preview && (
        <div className="admin-notice">
          Vorschau · Alle Kennzahlen sind Beispieldaten.
        </div>
      )}
      <form action="/admin/statistik" className="admin-filter">
        <label>
          Zeitraum
          <select name="tage" defaultValue={days}>
            {[7, 30, 90].map((d) => (
              <option value={d} key={d}>
                {d} Tage
              </option>
            ))}
          </select>
        </label>
        <button className="button">Anzeigen</button>
      </form>
      <AdminStatistics preview={preview} days={days} />
    </main>
  );
}
