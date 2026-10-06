import { RenewForm } from "@/components/renew-form";
export const metadata = {
  title: "Gesuch verlängern",
  robots: { index: false, follow: false },
};
export default async function Renew({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main id="main" className="container narrow">
      <h1>Weiter nach dem passenden Teil suchen.</h1>
      <p>Verlängere dein Gesuch um weitere 30 Tage.</p>
      {token ? <RenewForm token={token} /> : <p>Der Link ist unvollständig.</p>}
    </main>
  );
}
