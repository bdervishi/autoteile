"use client";
import { useState } from "react";
import { SafeForm } from "./safe-form";
import { saveContact, addContactNote } from "@/app/admin/crm/actions";
import { CRM_STAGES } from "@/lib/crm.schemas";
export type ContactFields = {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  stage: string;
  note: string;
  next_contact_at: string | null;
};
export function CrmContactForm({
  contact,
  disabled = false,
}: {
  contact?: ContactFields;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const r = await saveContact({
            id: contact?.id || "",
            name: String(f.get("name")),
            email: String(f.get("email")),
            company: String(f.get("company") || ""),
            phone: String(f.get("phone") || ""),
            stage: String(f.get("stage")),
            note: String(f.get("note") || ""),
            nextContact: String(f.get("nextContact") || ""),
          });
          setMessage(r.ok ? r.data.message : r.error);
        } catch {
          setMessage("Bitte erneut versuchen.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Name
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={contact?.name}
          />
        </label>
        <label>
          E-Mail
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            defaultValue={contact?.email}
          />
        </label>
        <label>
          Firma
          <input
            name="company"
            maxLength={120}
            defaultValue={contact?.company}
          />
        </label>
        <label>
          Telefon
          <input name="phone" maxLength={40} defaultValue={contact?.phone} />
        </label>
        <label>
          Phase
          <select name="stage" defaultValue={contact?.stage || "lead"}>
            {Object.entries(CRM_STAGES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wiedervorlage
          <input
            name="nextContact"
            type="date"
            defaultValue={contact?.next_contact_at || ""}
          />
        </label>
      </div>
      <label>
        Zusammenfassung
        <textarea
          name="note"
          rows={3}
          maxLength={2000}
          defaultValue={contact?.note}
        />
      </label>
      <button className="button primary" disabled={disabled || busy}>
        Kontakt speichern
      </button>
      {message && <p role="status">{message}</p>}
    </SafeForm>
  );
}
export function CrmNoteForm({ id }: { id: string }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <SafeForm
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await addContactNote({ contactId: id, body });
          setMessage(r.ok ? r.data.message : r.error);
          if (r.ok) setBody("");
        } catch {
          setMessage("Bitte erneut versuchen.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Neue Gesprächsnotiz
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          rows={3}
        />
      </label>
      <button className="button" disabled={busy}>
        Notiz hinzufügen
      </button>
      {message && <p role="status">{message}</p>}
    </SafeForm>
  );
}
