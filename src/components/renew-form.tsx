"use client";
import { useState } from "react";
import { renewWanted } from "@/app/teile/wanted.actions";
export function RenewForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        className="button primary"
        disabled={done}
        onClick={async () => {
          const r = await renewWanted(token);
          setDone(r.ok);
          setMessage(r.ok ? r.data.message : r.error);
        }}
      >
        Um 30 Tage verlängern
      </button>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </>
  );
}
