import Link from "next/link";
import { currentUser } from "@/lib/server/auth";
import { databaseConfigured, db } from "@/lib/server/db";
import { CommercialRequestForm } from "@/components/commercial-request-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pilotpartner werden",
  robots: { index: false, follow: false },
};
export default async function Partner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  const configured = databaseConfigured();
  const items =
    user && configured
      ? await db()
          .from("parts_items")
          .select("id,title")
          .eq("owner_user_id", user.id)
          .eq("status", "available")
          .is("moderation_hidden_at", null)
          .not("email_confirmed_at", "is", null)
      : { data: [] };
  const requests =
    user && configured
      ? await db()
          .from("commercial_requests")
          .select("id,offer,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] };
  return (
    <main id="main" className="container narrow">
      <p className="eyebrow">GEMEINSAM STARTEN</p>
      <h1>Werde Pilotpartner.</h1>
      <p>
        Händlerpakete, mehr Sichtbarkeit oder eine Zusammenarbeit mit deiner
        Garage: Sag uns, was zu dir passt.
      </p>
      {!user && (
        <p>
          <Link href="/teile/meine">Mit deinem Konto anmelden</Link>, um eine
          Anfrage zu senden.
        </p>
      )}
      <section className="panel">
        <CommercialRequestForm
          initialOffer={params.angebot}
          initialItem={params.inserat}
          enabled={!!user && configured}
          items={items.data || []}
        />
      </section>
      {!!requests.data?.length && (
        <section className="panel">
          <h2>Deine Anfragen</h2>
          {requests.data.map((r) => (
            <p key={r.id}>
              {r.offer} ·{" "}
              {(
                {
                  new: "Eingegangen",
                  contacted: "In Kontakt",
                  accepted: "Vereinbarung vorgemerkt",
                  declined: "Abgelehnt",
                } as Record<string, string>
              )[r.status] || r.status}
            </p>
          ))}
          <p className="hint">
            Der Anfragestatus ist kein Zahlungs- oder Abostatus.
          </p>
        </section>
      )}
      <Link href="/preise">Alle Pakete ansehen</Link>
    </main>
  );
}
