import Link from "next/link";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { markNotificationsRead } from "@/app/teile/notification.actions";
import { swissDate } from "@/lib/constants";
export async function Notifications() {
  const user = await currentUser();
  if (!user) return null;
  const { data } = await db()
    .from("notifications")
    .select("id,title,href,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  return (
    <section style={{ marginBottom: 40 }}>
      <h2>Benachrichtigungen</h2>
      {!data?.length ? (
        <p>Du bist auf dem aktuellen Stand.</p>
      ) : (
        <>
          <form action={markNotificationsRead}>
            <button className="button small">Alle als gelesen markieren</button>
          </form>
          {data.map((note) => (
            <article className="panel" key={note.id}>
              <p>
                {!note.read_at && <strong>Neu · </strong>}
                {note.title}
              </p>
              <small>{swissDate(note.created_at)}</small>
              {note.href?.startsWith("/") && !note.href.startsWith("//") && (
                <p>
                  <Link href={note.href}>Öffnen</Link>
                </p>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
