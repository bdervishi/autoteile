import { OwnedItems } from "@/components/owned-items";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Meine Inserate",
  robots: { index: false, follow: false },
};
export default async function GuestManagement({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main id="main" className="container narrow">
      <h1>Deine Teilebörse.</h1>
      <OwnedItems token={token} />
    </main>
  );
}
