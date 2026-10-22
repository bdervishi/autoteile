"use client";
import { SafeForm } from "./safe-form";
import { useState } from "react";
import { confirmListing } from "@/app/teile/actions";
import { ShareButtons } from "./share-buttons";
import Link from "next/link";
export function ConfirmForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [id, setId] = useState("");
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
          if (result.ok) setId(result.data.id);
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
      {id && (
        <>
          <Link className="button primary" href={`/teile/${id}`}>
            Inserat ansehen
          </Link>
          <ShareButtons
            path={`/teile/${id}`}
            title="Mein Inserat"
            heading="Jetzt teilen und schneller abgeben"
          />
        </>
      )}
    </SafeForm>
  );
}
