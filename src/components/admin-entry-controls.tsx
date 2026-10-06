"use client";
import { useState } from "react";
import { manageEntry } from "@/app/admin/actions";
export function AdminEntryControls({
  id,
  kind,
  hidden,
}: {
  id: string;
  kind: "item" | "business";
  hidden: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="admin-entry-controls">
      <label>
        Begründung
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          placeholder="Prüfung dokumentieren"
        />
      </label>
      <button
        className="button small"
        disabled={busy || !reason.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await manageEntry({
              id,
              kind,
              action:
                kind === "item"
                  ? hidden
                    ? "unhide"
                    : "hide"
                  : hidden
                    ? "unverify"
                    : "verify",
              reason,
            });
            setMessage(r.ok ? r.data.message : r.error);
          } catch {
            setMessage("Bitte erneut versuchen.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {kind === "item"
          ? hidden
            ? "Einblenden"
            : "Ausblenden"
          : hidden
            ? "Prüfsiegel entfernen"
            : "Als geprüft markieren"}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
