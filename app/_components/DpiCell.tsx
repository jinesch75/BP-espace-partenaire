"use client";

import { useState } from "react";
import { assignDpiCourse, markDpi } from "@/app/manager/_actions";

type Option = { id: number; label: string };

function Mark({
  traineeId,
  colKey,
  status,
  label,
  className,
  onDone,
}: {
  traineeId: number;
  colKey: string;
  status: string;
  label: string;
  className: string;
  onDone: () => void;
}) {
  return (
    <form action={markDpi}>
      <input type="hidden" name="traineeId" value={traineeId} />
      <input type="hidden" name="key" value={colKey} />
      <input type="hidden" name="status" value={status} />
      <button
        onClick={() => onDone()}
        className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${className}`}
      >
        {label}
      </button>
    </form>
  );
}

export function DpiCell({
  traineeId,
  colKey,
  options,
  currentCourseId,
  children,
}: {
  traineeId: number;
  colKey: string;
  options: Option[];
  currentCourseId: number | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Cliquer pour affecter / changer le statut"
        className="inline-flex min-w-[2rem] justify-center rounded p-1 hover:bg-slate-100"
      >
        {children}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-1/2 z-20 mt-1 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
            {options.length > 0 ? (
              <form
                action={assignDpiCourse}
                className="space-y-2"
                onSubmit={() => setOpen(false)}
              >
                <input type="hidden" name="traineeId" value={traineeId} />
                <label className="label text-xs">
                  Affecter une activité (à venir)
                </label>
                <select
                  name="courseId"
                  className="input"
                  defaultValue={currentCourseId ?? ""}
                  required
                >
                  <option value="">— choisir —</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button className="btn-primary w-full">Affecter</button>
              </form>
            ) : (
              <p className="text-xs text-slate-400">
                Aucune activité à venir pour cette étape.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
              <Mark
                traineeId={traineeId}
                colKey={colKey}
                status="PRESENT"
                label="A participé"
                className="border-green-300 text-green-700 hover:bg-green-50"
                onDone={() => setOpen(false)}
              />
              <Mark
                traineeId={traineeId}
                colKey={colKey}
                status="ABSENT"
                label="Absent"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onDone={() => setOpen(false)}
              />
              <Mark
                traineeId={traineeId}
                colKey={colKey}
                status="CLEAR"
                label="Retirer"
                className="border-slate-300 text-slate-500 hover:bg-slate-50"
                onDone={() => setOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
