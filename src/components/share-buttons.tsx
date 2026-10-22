"use client";
import { useEffect, useState } from "react";
import {
  Share2,
  MessageCircle,
  Facebook,
  Mail,
  Link2,
  Check,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/constants";
export function ShareButtons({
  path,
  title,
  heading = "Inserat teilen",
}: {
  path: string;
  title: string;
  heading?: string;
}) {
  const [url, setUrl] = useState(path);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setUrl(new URL(path, window.location.origin).toString());
    setCanShare(typeof navigator.share === "function");
  }, [path]);
  const text = `${title} – gesehen auf ${BRAND_NAME}`;
  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Abgebrochen oder nicht erlaubt: die Buttons bleiben verfügbar.
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Link kopieren:", url);
    }
  }
  return (
    <div className="share">
      <h3>{heading}</h3>
      <div className="share-buttons">
        {canShare && (
          <button type="button" className="button small" onClick={nativeShare}>
            <Share2 size={16} /> Teilen
          </button>
        )}
        <a
          className="button small"
          href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
        <a
          className="button small"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Facebook size={16} /> Facebook
        </a>
        <a
          className="button small"
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`}
        >
          <Mail size={16} /> E-Mail
        </a>
        <button type="button" className="button small" onClick={copy}>
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? "Kopiert" : "Link kopieren"}
        </button>
      </div>
    </div>
  );
}
