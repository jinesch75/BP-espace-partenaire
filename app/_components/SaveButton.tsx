"use client";

import { useEffect, useRef, useState } from "react";

// A submit button that is grey/disabled until something in its form changes,
// then turns orange to signal there are unsaved changes. Resets on submit.
export function SaveButton({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const mark = () => setDirty(true);
    const reset = () => setDirty(false);
    form.addEventListener("input", mark);
    form.addEventListener("change", mark);
    form.addEventListener("submit", reset);
    return () => {
      form.removeEventListener("input", mark);
      form.removeEventListener("change", mark);
      form.removeEventListener("submit", reset);
    };
  }, []);

  const cls = dirty
    ? "btn-primary"
    : "btn border-slate-200 bg-slate-200 text-slate-400 cursor-not-allowed";

  return (
    <button
      ref={ref}
      type="submit"
      disabled={!dirty}
      className={`${cls}${className ? " " + className : ""}`}
    >
      {children}
    </button>
  );
}
