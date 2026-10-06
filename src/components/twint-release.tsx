"use client";
import { useState } from "react";
import { releaseTwint } from "@/app/teile/conversation.actions";
export function TwintRelease({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button primary"
        disabled={busy || done}
        onClick={async () => {
          setBusy(true);
          const result = await releaseTwint(token);
          setDone(result.ok);
          setMessage(result.ok ? result.data.message : result.error);
          setBusy(false);
        }}
      >
        TWINT-Nummer für diese Person freigeben
      </button>
      {message && (
        <div className="form-message" role="status">
          {message}
        </div>
      )}
    </>
  );
}
