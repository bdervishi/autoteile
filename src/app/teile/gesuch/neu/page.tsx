import { WantedForm } from "@/components/wanted-form";
export const metadata = { title: "Gesuch aufgeben" };
export default function NewWanted() {
  return (
    <main id="main" className="container wizard">
      <div className="eyebrow">Wir suchen mit</div>
      <h1 style={{ marginTop: 12 }}>Was fehlt dir noch?</h1>
      <p>
        Bis zu fünf Teile in einem Gesuch. Sobald ein passendes Inserat
        erscheint, erhältst du eine E-Mail.
      </p>
      <WantedForm />
    </main>
  );
}
