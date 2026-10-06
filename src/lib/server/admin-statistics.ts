import "server-only";
import { db } from "./db";
export async function adminStatistics(preview: boolean, days: number) {
  if (preview)
    return {
      items: 24,
      newItems: 8,
      reports: 2,
      wanted: 3,
      businesses: 4,
      contacts: 6,
      due: 2,
      requests: 5,
      trend: [
        { day: "Woche 1", count: 2 },
        { day: "Woche 2", count: 5 },
        { day: "Woche 3", count: 3 },
        { day: "Woche 4", count: 8 },
      ],
      error: false,
    };
  const start = new Date(Date.now() - days * 86400000).toISOString();
  const d = db();
  const queries = await Promise.all([
    d.from("parts_items").select("id", { count: "exact", head: true }),
    d
      .from("parts_items")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start),
    d
      .from("parts_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    d
      .from("parts_wanted")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    d.from("businesses").select("id", { count: "exact", head: true }),
    d.from("crm_contacts").select("id", { count: "exact", head: true }),
    d
      .from("crm_contacts")
      .select("id", { count: "exact", head: true })
      .neq("stage", "closed")
      .lte(
        "next_contact_at",
        new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" }),
      ),
    d
      .from("commercial_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    d.rpc("admin_listing_trend", { p_days: days }),
  ]);
  return {
    items: queries[0].count || 0,
    newItems: queries[1].count || 0,
    reports: queries[2].count || 0,
    wanted: queries[3].count || 0,
    businesses: queries[4].count || 0,
    contacts: queries[5].count || 0,
    due: queries[6].count || 0,
    requests: queries[7].count || 0,
    trend: (queries[8].data || []) as { day: string; count: number }[],
    error: queries.some((r) => r.error),
  };
}
