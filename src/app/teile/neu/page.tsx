import { ListingWizard } from "@/components/listing-wizard";
export const metadata = { title: "Inserat aufgeben" };
import { currentUser } from "@/lib/server/auth";
import { db, databaseConfigured } from "@/lib/server/db";
export default async function NewListing({
  searchParams,
}: {
  searchParams: Promise<{ wanted?: string }>;
}) {
  const { wanted } = await searchParams;
  const user = await currentUser();
  let businesses: { id: string; name: string }[] = [];
  if (user) {
    const { data } = await db()
      .from("businesses")
      .select("id,name")
      .eq("owner_user_id", user.id);
    businesses = data || [];
  }
  let prefill;
  if (wanted && /^[a-f0-9-]{36}$/.test(wanted) && databaseConfigured()) {
    const { data } = await db()
      .from("parts_wanted")
      .select("id,category,group_title,make,model,year,oem_number")
      .eq("id", wanted)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) prefill = { ...data, title: data.group_title };
  }
  return (
    <main id="main" className="container wizard">
      <div className="eyebrow">Eine zweite Runde für gute Teile</div>
      <h1 style={{ marginTop: 12 }}>Dein neues Inserat.</h1>
      <p>In drei Schritten von deiner Garage zur nächsten.</p>
      <ListingWizard prefill={prefill} businesses={businesses} />
    </main>
  );
}
