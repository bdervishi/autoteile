"use client";
import { useState } from "react";
import { moderate } from "@/app/admin/actions";
export function AdminControls({
  id,
  kind,
}: {
  id: string;
  kind: "report" | "wanted";
}) {
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const buttons =
    kind === "wanted"
      ? [
          ["approve", "Freigeben"],
          ["reject", "Ablehnen"],
        ]
      : [
          ["unhide", "Einblenden"],
          ["withdraw", "Zurückziehen"],
          ["delete", "Entfernen"],
          ["dismiss", "Meldung verwerfen"],
        ];
  return (
    <>
      <label>
        Begründung
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
        />
      </label>
      <div className="inline-links" style={{ marginTop: 14 }}>
        {buttons.map(([action, label]) => (
          <button
            key={action}
            className="button small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await moderate({ id, kind, action, reason });
              setMessage(r.ok ? r.data.message : r.error);
              setBusy(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </>
  );
}
