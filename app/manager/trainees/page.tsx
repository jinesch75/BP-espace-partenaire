import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";
import { DPI_COLUMNS as COLUMNS } from "@/lib/dpi";

export const dynamic = "force-dynamic";

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
          chiffré. Suivi de participation aux six activités du parcours.
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
              <th className="th"></th>
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
                <td className="td text-right">
                  <Link
                    href={`/manager/trainees/${t.id}`}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Gérer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
