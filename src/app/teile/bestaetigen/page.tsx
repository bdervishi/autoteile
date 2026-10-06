import { ConfirmForm } from "@/components/confirm-form";
export const metadata = {
  title: "Inserat bestätigen",
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
      <h1>Dein Inserat bestätigen.</h1>
      <p>
        Mit dem Klick bestätigst du deine E-Mail-Adresse und veröffentlichst das
        Inserat.
      </p>
      {token ? (
        <ConfirmForm token={token} />
      ) : (
        <p>Der Bestätigungslink ist unvollständig.</p>
      )}
    </main>
  );
}
