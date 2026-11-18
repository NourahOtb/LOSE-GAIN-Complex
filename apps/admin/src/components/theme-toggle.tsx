"use client";

import { useState } from "react";

/** Light (default) / dark switch. The choice is saved in a cookie for a year. */
export function ThemeToggle({ initial, className = "", iconOnly = false }: { initial: "light" | "dark"; className?: string; iconOnly?: boolean }) {
  const [dark, setDark] = useState(initial === "dark");
  const flip = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    document.cookie = `lg-theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`inline-flex h-9 items-center gap-2 rounded border-[1.5px] border-current px-2.5 text-sm font-semibold ${className}`}>
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      {iconOnly ? null : <span>{dark ? "Light" : "Dark"}</span>}
    </button>
  );
}
