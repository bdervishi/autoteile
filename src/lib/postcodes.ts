import codes from "@/data/postcodes.json";
export function postcodeInfo(
  zip: string,
): { cantons: string[]; cities: string[] } | null {
  return (
    (codes as Record<string, { cantons: string[]; cities: string[] }>)[zip] ||
    null
  );
}
