import { BusinessForm } from "@/components/business-form";
export const metadata = { title: "Firmenprofil erstellen" };
export default function NewBusiness() {
  return (
    <main id="main" className="container narrow">
      <div className="eyebrow">Für Garagen, Händler & Pneuhäuser</div>
      <h1 style={{ marginTop: 12 }}>Dein Firmenprofil.</h1>
      <p>
        Für das Erstellen brauchst du ein Konto mit bestätigter E-Mail-Adresse.
      </p>
      <BusinessForm />
    </main>
  );
}
