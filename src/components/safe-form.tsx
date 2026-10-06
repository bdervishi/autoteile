"use client";
import { useEffect, useState, type ComponentProps } from "react";
// Server-rendered controls must not accept clicks before React has attached handlers.
export function SafeForm({ children, ...props }: ComponentProps<"form">) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <form {...props}>
      <fieldset disabled={!ready} className="interactive-fieldset">
        {children}
      </fieldset>
    </form>
  );
}
