import { WantedConfirmation } from "@/components/wanted-form";
export const metadata = {
  title: "Gesuch bestätigen",
  robots: { index: false, follow: false },
};
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main id="main" className="container narrow">
      <h1>Dein Gesuch bestätigen.</h1>
      <p>Nach deinem Klick wird dein Gesuch zur Prüfung eingereicht.</p>
      {token ? (
        <WantedConfirmation token={token} />
      ) : (
        <p>Der Bestätigungslink ist unvollständig.</p>
      )}
    </main>
  );
}
