"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import {
  writeMessage,
  changeTradeStatus,
} from "@/app/teile/conversation.actions";
export function ConversationControls({
  token,
  role,
  status,
}: {
  token: string;
  role: "owner" | "requester";
  status: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function change(action: string) {
    setBusy(true);
    const result = await changeTradeStatus(token, action);
    setMessage(result.ok ? result.data.message : result.error);
    setBusy(false);
  }
  return (
    <div>
      {["requested", "accepted"].includes(status) && (
        <>
          <div className="inline-links" style={{ marginBottom: 24 }}>
            {role === "owner" ? (
              status === "requested" ? (
                <>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => change("accept")}
                  >
                    Zusagen
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => change("decline")}
                  >
                    Absagen
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => change("complete")}
                  >
                    Übergabe erledigt
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => change("release")}
                  >
                    Reservierung aufheben
                  </button>
                </>
              )
            ) : (
              <button
                className="button"
                disabled={busy}
                onClick={() => change("cancel")}
              >
                Anfrage zurückziehen
              </button>
            )}
          </div>
          <SafeForm
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const result = await writeMessage(
                token,
                String(new FormData(e.currentTarget).get("body")),
              );
              setMessage(result.ok ? result.data.message : result.error);
              setBusy(false);
            }}
          >
            <label>
              Deine Nachricht
              <textarea name="body" required minLength={1} maxLength={2000} />
            </label>
            <button
              className="button primary"
              disabled={busy}
              style={{ marginTop: 15 }}
            >
              Nachricht senden
            </button>
          </SafeForm>
        </>
      )}
      {message && (
        <div role="status" className="form-message">
          {message}
        </div>
      )}
    </div>
  );
}
