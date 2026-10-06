"use client";
import { useState } from "react";
import { importPartnerRequest } from "@/app/admin/crm/actions";
import { decideCommercialRequest } from "@/app/preise/actions";
export function CommercialAdminControls({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await importPartnerRequest(id);
            setMessage(r.ok ? r.data.message : r.error);
          } catch {
            setMessage("Bitte erneut versuchen.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Ins CRM übernehmen
      </button>
      <label>
        Interne Notiz
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
        />
      </label>
      <div className="inline-links">
        {[
          ["contacted", "In Kontakt"],
          ["accepted", "Vereinbarung vormerken"],
          ["declined", "Ablehnen"],
        ].map(([status, label]) => (
          <button
            className="button small"
            key={status}
            disabled={busy || !note.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await decideCommercialRequest({ id, status, note });
                setMessage(r.ok ? r.data.message : r.error);
              } catch {
                setMessage("Bitte erneut versuchen.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
    </>
  );
}
