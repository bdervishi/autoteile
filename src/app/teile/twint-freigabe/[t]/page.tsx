import { TwintRelease } from "@/components/twint-release";
export const metadata = {
  title: "TWINT-Nummer freigeben",
  robots: { index: false, follow: false },
};
export default async function Twint({
  params,
}: {
  params: Promise<{ t: string }>;
}) {
  const { t } = await params;
  return (
    <main id="main" className="container narrow">
      <h1>Du entscheidest über die Freigabe.</h1>
      <p>
        Mit dem Klick wird deine TWINT-Nummer dieser einen Person im
        Anfrage-Verlauf und per E-Mail mitgeteilt.
      </p>
      <TwintRelease token={t} />
    </main>
  );
}
