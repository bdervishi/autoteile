"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { openManagedTrade, withdrawOwnedListing } from "@/app/teile/actions";
export function OpenTrade({ id, token }: { id: string; token?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await openManagedTrade(id, token);
          if (r.ok) router.push(`/teile/anfrage/${r.data.token}`);
          else setMessage(r.error);
          setBusy(false);
        }}
      >
        Verlauf öffnen
      </button>
      {message && <p className="form-message">{message}</p>}
    </>
  );
}
export function WithdrawListing({ id, token }: { id: string; token?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await withdrawOwnedListing(id, token);
          setMessage(r.ok ? r.data.message : r.error);
          setBusy(false);
        }}
      >
        Inserat zurückziehen
      </button>
      {message && <p className="form-message">{message}</p>}
    </>
  );
}
