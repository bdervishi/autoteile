"use client";
declare global {
  interface Window {
    grecaptcha?: {
      ready: (fn: () => void) => void;
      execute: (key: string, input: { action: string }) => Promise<string>;
    };
  }
}
let loading: Promise<void> | null = null;
export async function captcha(action: string) {
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!key) return "";
  if (!loading)
    loading = new Promise((resolve, reject) => {
      if (window.grecaptcha) return resolve();
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = null;
        reject(new Error("Sicherheitsprüfung konnte nicht geladen werden."));
      };
      document.head.appendChild(script);
    });
  await loading;
  return new Promise<string>((resolve, reject) =>
    window.grecaptcha
      ? window.grecaptcha.ready(() =>
          window.grecaptcha!.execute(key, { action }).then(resolve, reject),
        )
      : reject(new Error("Sicherheitsprüfung nicht verfügbar.")),
  );
}
