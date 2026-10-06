import { RatingForm } from "./rating-form";
import { Notifications } from "./notifications";
import Link from "next/link";
import { managedItems } from "@/lib/server/management";
import { db } from "@/lib/server/db";
import { OpenTrade, WithdrawListing } from "./managed-controls";
export async function OwnedItems({ token }: { token?: string }) {
  const data = await managedItems(token);
  if (!data) return <p>Dieser Zugangslink ist ungültig oder abgelaufen.</p>;
  const labels: Record<string, string> = {
    available: "Verfügbar",
    reserved: "Reserviert",
    completed: "Abgeschlossen",
    withdrawn: "Zurückgezogen",
  };
  let ownRequests = db()
    .from("parts_trades")
    .select(
      "id,item_id,status,requester_name,requester_user_id,parts_items(title,owner_user_id)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  ownRequests =
    data.identity.kind === "user"
      ? ownRequests.eq("requester_user_id", data.identity.id)
      : ownRequests
          .eq("requester_email", data.identity.email)
          .is("requester_user_id", null);
  const { data: requested } = await ownRequests;
  const { data: received } = data.items.length
    ? await db()
        .from("parts_trades")
        .select(
          "id,item_id,status,requester_name,requester_user_id,parts_items(title,owner_user_id)",
        )
        .in(
          "item_id",
          data.items.map((i) => i.id),
        )
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  let wanted = db()
    .from("parts_wanted")
    .select("id,group_id,group_title,status,category")
    .order("created_at", { ascending: false })
    .limit(50);
  wanted =
    data.identity.kind === "user"
      ? wanted.eq("owner_user_id", data.identity.id)
      : wanted.eq("guest_email", data.identity.email).is("owner_user_id", null);
  const { data: wantedRows } = await wanted;
  return (
    <>
      {data.identity.kind === "user" && <Notifications />}
      <section>
        <h2>Meine Inserate</h2>
        {data.items.length ? (
          data.items.map((item) => (
            <article className="panel" key={item.id}>
              <h3>{item.title}</h3>
              <p className="hint">{labels[item.status]}</p>
              <div className="inline-links">
                <Link className="button small" href={`/teile/${item.id}`}>
                  Inserat ansehen
                </Link>
                {data.identity.kind === "user" &&
                  item.status === "available" && (
                    <Link
                      className="button small"
                      href={`/partner?angebot=boost&inserat=${item.id}`}
                    >
                      Boost vormerken
                    </Link>
                  )}
                {item.status === "available" && (
                  <WithdrawListing id={item.id} token={token} />
                )}
              </div>
            </article>
          ))
        ) : (
          <p>Du hast noch keine Inserate.</p>
        )}
        <div className="inline-links">
          <Link className="button primary" href="/teile/neu">
            Neues Inserat
          </Link>
          <Link className="button" href="/anbieter/neu">
            Firmenprofil erstellen
          </Link>
        </div>
      </section>
      <section style={{ marginTop: 40 }}>
        <h2>Meine Anfragen</h2>
        {[...(received || []), ...(requested || [])].map((t) => (
          <article className="panel" key={t.id}>
            <h3>
              {(t.parts_items as unknown as { title: string })?.title ||
                "Anfrage"}
            </h3>
            <p className="hint">{t.status}</p>
            <OpenTrade id={t.id} token={token} />
            {data.identity.kind === "user" &&
              t.status === "completed" &&
              (() => {
                const item = t.parts_items as unknown as {
                  owner_user_id: string | null;
                };
                const peer =
                  item?.owner_user_id === data.identity.id
                    ? t.requester_user_id
                    : item?.owner_user_id;
                return peer && peer !== data.identity.id ? (
                  <RatingForm itemId={t.item_id} ratedUserId={peer} />
                ) : null;
              })()}
          </article>
        ))}
      </section>
      <section style={{ marginTop: 40 }}>
        <h2>Meine Gesuche</h2>
        {Array.from(
          new Map((wantedRows || []).map((w) => [w.group_id, w])).values(),
        ).map((w) => (
          <article className="panel" key={w.id}>
            <h3>{w.group_title}</h3>
            <p className="hint">{w.status}</p>
          </article>
        ))}
      </section>
    </>
  );
}
