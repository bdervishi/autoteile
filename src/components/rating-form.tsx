"use client";
import { useState } from "react";
import { SafeForm } from "./safe-form";
import { rateTrade } from "@/app/teile/rating.actions";
export function RatingForm({
  itemId,
  ratedUserId,
}: {
  itemId: string;
  ratedUserId: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <SafeForm
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        const values = new FormData(event.currentTarget);
        const result = await rateTrade({
          item_id: itemId,
          rated_user_id: ratedUserId,
          stars: Number(values.get("stars")),
          comment: String(values.get("comment") || ""),
        });
        setMessage(result.ok ? result.data.message : result.error);
        setBusy(false);
      }}
    >
      <p>
        Übergabe bewerten. Deine Bewertung kann nach dem Absenden nicht geändert
        werden.
      </p>
      <label>
        Sterne
        <select name="stars" defaultValue="5">
          {[5, 4, 3, 2, 1].map((stars) => (
            <option key={stars} value={stars}>
              {stars} Sterne
            </option>
          ))}
        </select>
      </label>
      <label>
        Kommentar (optional)
        <textarea name="comment" maxLength={1000} />
      </label>
      <button className="button" disabled={busy}>
        Bewertung absenden
      </button>
      <p role="status">{message}</p>
    </SafeForm>
  );
}
