"use client";

import { useState } from "react";

export function TempBanner({ name, temp }: { name: string; temp: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(temp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable (insecure context, permissions); the
      // input is selectable as a fallback.
    }
  }
  return (
    <div className="mb-4 rounded-lg border border-amber_-500/40 bg-amber_-500/10 p-4">
      <p className="text-sm text-amber_-700 mb-2">
        Neues Passwort für <strong>{name || "Mitglied"}</strong> — bitte einmal
        kopieren und per WhatsApp weitergeben:
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <input
          readOnly
          value={temp}
          onFocus={(e) => e.currentTarget.select()}
          className="input font-mono text-sm"
        />
        <button
          type="button"
          onClick={onCopy}
          className="btn-primary whitespace-nowrap"
        >
          {copied ? "Kopiert ✓" : "Kopieren"}
        </button>
      </div>
      <p className="mt-2 text-xs text-amber_-700/80">
        Dieses Passwort wird nur einmal angezeigt. Es ersetzt das alte Passwort
        sofort. Alle bestehenden Sitzungen dieses Mitglieds werden ungültig.
      </p>
    </div>
  );
}
