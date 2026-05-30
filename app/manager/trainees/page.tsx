import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function ManagerTrainees() {
  requireManager();

  const trainees = await prisma.trainee.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      assignments: {
        include: { course: { include: { partner: true } } },
        orderBy: { assignedDate: "asc" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Base des participants</h1>
        <p className="text-sm text-slate-500">
          {trainees.length} participants. Le numéro national est sensible —
          chiffrez-le avant toute donnée réelle. Les affectations sont faites par
          ONA.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="th">Nom de famille</th>
              <th className="th">Prénom</th>
              <th className="th">Numéro national</th>
              <th className="th">Cours affectés (date)</th>
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
                <td className="td">
                  {t.assignments.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {t.assignments.map((a) => (
                        <li key={a.id}>
                          <span className="font-medium">{a.course.title}</span>{" "}
                          <span className="text-slate-500">
                            ({formatDate(a.assignedDate)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
