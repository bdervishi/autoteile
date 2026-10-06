export function Honeypot() {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Dieses Feld bitte leer lassen
        <input
          name="ag_hp_field"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          tabIndex={-1}
        />
      </label>
    </div>
  );
}
