import { ManagementForm } from "@/components/management-form";
import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/server/auth";
import { OwnedItems } from "@/components/owned-items";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mein PARTVIVO",
  robots: { index: false, follow: false },
};
export default async function Management() {
  const user = await currentUser();
  return (
    <main id="main" className="container narrow">
      <div className="eyebrow">Dein persönlicher Bereich</div>
      <h1 style={{ marginTop: 12 }}>Deine Teile. Dein Überblick.</h1>
      {user ? (
        <OwnedItems />
      ) : (
        <>
          <p>
            Als Gast verwaltest du deine Inserate per persönlichem Link. Ein
            Konto verbindet deine bestätigten Gast-Inserate mit deinem Bereich.
          </p>
          <div className="panel">
            <h2>Verwaltung ohne Konto</h2>
            <ManagementForm />
          </div>
          <div className="panel">
            <h2>Anmelden oder Konto erstellen</h2>
            <LoginForm />
          </div>
        </>
      )}
    </main>
  );
}
