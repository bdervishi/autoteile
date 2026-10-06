"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { confirmListing } from "@/app/teile/actions";
export function ConfirmForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const result = await confirmListing(token);
          setOk(result.ok);
          setMessage(result.ok ? result.data.message : result.error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <button className="button primary" disabled={busy || ok}>
        {busy ? "Bitte warten …" : "Inserat jetzt bestätigen"}
      </button>
      {message && (
        <div
          role="status"
          className={`form-message ${ok ? "success-message" : ""}`}
        >
          {message}
        </div>
      )}
    </SafeForm>
  );
}
