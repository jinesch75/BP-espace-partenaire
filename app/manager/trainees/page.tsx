import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function norm(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// The six courses tracked as columns.
const COLUMNS: { key: string; label: string; match: (title: string) => boolean }[] = [
  { key: "DAPA1", label: "DAPA 1", match: (t) => norm(t) === "DAPA1" },
  { key: "DAPA2", label: "DAPA 2", match: (t) => norm(t) === "DAPA2" },
  { key: "DAPA3", label: "DAPA 3", match: (t) => norm(t) === "DAPA3" },
  { key: "DAPA4", label: "DAPA 4", match: (t) => norm(t) === "DAPA4" },
  { key: "DAPA5", label: "DAPA 5", match: (t) => norm(t) === "DAPA5" },
  {
    key: "BIENV",
    label: "Bienvenue",
    match: (t) => /bienvenue/i.test(t) || norm(t) === "WELCOME",
  },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5L15.5 6" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}
function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default async function ManagerTrainees() {
  requireManager();

  const trainees = await prisma.trainee.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      assignments: {
        include: { course: { select: { title: true } } },
        orderBy: { assignedDate: "asc" },
      },
    },
  });

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">
          Demandeurs de protection internationale (DPI)
        </h1>
        <p className="text-sm text-slate-500">
          {trainees.length} participants. Le numéro national est sensible et
          chiffré. Suivi de participation aux six cours du parcours.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><CheckIcon /> A participé</span>
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-amber-600">jj/mm/aa</span> Programmé (date prévue)
        </span>
        <span className="inline-flex items-center gap-1"><CrossIcon /> N&apos;a pas participé</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="th">Nom de famille</th>
              <th className="th">Prénom</th>
              <th className="th">Numéro national</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="th text-center">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trainees.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.lastName}</td>
                <td className="td">{t.firstName}</td>
                <td className="td whitespace-nowrap">
                  {decryptSensitive(t.nationalNumber)}
                </td>
                {COLUMNS.map((c) => {
                  const a = t.assignments.find((x) => c.match(x.course.title));
                  let cell: React.ReactNode;
                  if (!a) {
                    cell = (
                      <span title="N'a pas participé">
                        <CrossIcon />
                      </span>
                    );
                  } else if (new Date(a.assignedDate).getTime() <= now) {
                    cell = (
                      <span title={`A participé — ${formatDate(a.assignedDate)}`}>
                        <CheckIcon />
                      </span>
                    );
                  } else {
                    cell = (
                      <span
                        className="whitespace-nowrap text-xs font-semibold text-amber-600"
                        title={`Programmé le ${formatDate(a.assignedDate)}`}
                      >
                        {shortDate(a.assignedDate)}
                      </span>
                    );
                  }
                  return (
                    <td key={c.key} className="td text-center">
                      <span className="inline-flex justify-center">{cell}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
