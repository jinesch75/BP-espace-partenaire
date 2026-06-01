"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Event = {
  date: string; // YYYY-MM-DD
  courseId: number;
  title: string;
  color: string;
  seq: number;
  total: number;
  time: string;
  where: string;
  sessions: { seq: number; date: string }[];
};

// "12/06" from "2026-06-12"
function dm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ActivityCalendar({
  events,
  legend,
}: {
  events: Event[];
  legend: { label: string; color: string }[];
}) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = new Map<string, Event[]>();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelected(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelected(null);
  }

  function clickDay(d: number) {
    const key = ymd(year, month, d);
    const evs = byDate.get(key);
    if (evs && evs.length > 0) {
      setSelected(selected === key ? null : key);
    } else {
      // no activity that day → create one prefilled with this date
      router.push(`/partner/courses/new?date=${key}`);
    }
  }

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Calendrier des activités</h2>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="btn-secondary px-2 py-1">←</button>
          <span className="min-w-[140px] text-center text-sm font-semibold">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} className="btn-secondary px-2 py-1">→</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {DOW.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const key = ymd(year, month, d);
          const evs = byDate.get(key) ?? [];
          const isToday =
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
          return (
            <button
              key={i}
              onClick={() => clickDay(d)}
              title={evs.length ? "Voir les activités" : "Ajouter une activité ce jour"}
              className={`min-h-[64px] rounded-lg border p-1 text-left align-top transition-colors hover:border-brand ${
                selected === key
                  ? "border-brand bg-brand-light/40"
                  : isToday
                  ? "border-slate-200 bg-slate-100"
                  : "border-slate-200"
              }`}
            >
              <span className="text-xs text-slate-500">{d}</span>
              <span className="mt-1 flex flex-col gap-0.5">
                {evs.slice(0, 3).map((e, j) => {
                  const others = e.sessions.filter((x) => x.seq !== e.seq);
                  return (
                    <span
                      key={j}
                      className="block rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-tight text-white"
                      style={{ backgroundColor: e.color }}
                      title={e.title}
                    >
                      séance {e.seq}/{e.total}
                      {others.length > 0 && (
                        <span className="font-normal">
                          {" ("}
                          {others
                            .map((o) => `séance ${o.seq}/${e.total} ${dm(o.date)}`)
                            .join(", ")}
                          {")"}
                        </span>
                      )}
                    </span>
                  );
                })}
                {evs.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{evs.length - 3}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {selectedEvents.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-sm font-semibold text-slate-700">
            Activités du {selected!.split("-").reverse().join("/")}
          </p>
          {selectedEvents.map((e, i) => (
            <a
              key={i}
              href={`/partner/courses/${e.courseId}`}
              className="flex items-center gap-2 rounded-md border border-slate-100 p-2 text-sm hover:border-brand"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
              <span className="flex-1">
                <span className="font-medium text-slate-800">{e.title}</span>
                {e.total > 1 && (
                  <span className="ml-1 text-xs text-slate-400">
                    (séance {e.seq}/{e.total})
                  </span>
                )}
                <span className="block text-xs text-slate-500">
                  {e.time} · {e.where}
                </span>
              </span>
              <span className="text-brand">→</span>
            </a>
          ))}
        </div>
      )}

      {legend.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
