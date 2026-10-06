import { postcodeInfo } from "@/lib/postcodes";
export function GET(request: Request) {
  const zip = new URL(request.url).searchParams.get("zip") || "";
  if (!/^\d{4}$/.test(zip))
    return Response.json(
      { error: "Bitte eine vierstellige PLZ eingeben." },
      { status: 400 },
    );
  const info = postcodeInfo(zip);
  if (!info)
    return Response.json(
      {
        error:
          "Diese PLZ ist nicht im amtlichen Ortschaftenverzeichnis enthalten.",
      },
      { status: 404 },
    );
  return Response.json(info, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
