import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";
import { assignTrainee, removeAssignment } from "@/app/partner/_actions";

export const dynamic = "force-dynamic";

export default async function AssignPage() {
  const partner = await requirePartner();
  if (!partner.managesTrainees) redirect("/partner");

  const [courses, trainees] = await Promise.all([
    prisma.course.findMany({
      where: { partnerId: partner.id },
      orderBy: { title: "asc" },
      include: {
        sessions: { orderBy: { sequence: "asc" } },
        assignments: { include: { trainee: true } },
      },
    }),
    prisma.trainee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Affecter des participants</h1>
        <p className="text-sm text-slate-500">
          {partner.name} · ajoutez des participants de la base à un cours. Les
          places restantes sont affichées par session.
        </p>
      </div>

      {trainees.length === 0 && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700">
          La base des participants est vide. Elle sera remplie plus tard via
          l&apos;interconnexion Biergerpakt.
        </div>
      )}

      {courses.map((c) => {
        const assignedCount = c.assignments.length;
        return (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">{c.title}</h2>
              <span className="text-sm text-slate-500">
                {assignedCount} participant{assignedCount === 1 ? "" : "s"} affecté
                {assignedCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {c.sessions.map((s) => (
                <span
                  key={s.id}
                  className="badge-pill bg-slate-100 text-slate-600"
                >
                  {formatDate(s.date)} · {Math.max(0, s.placesAvailable - assignedCount)}/
                  {s.placesAvailable} restantes
                </span>
              ))}
            </div>

            <form action={assignTrainee} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="courseId" value={c.id} />
              <div className="min-w-[260px]">
                <label className="label">Ajouter un participant</label>
                <select name="traineeId" className="input" required>
                  <option value="">— choisir un participant —</option>
                  {trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lastName} {t.firstName} ({decryptSensitive(t.nationalNumber)})
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary">Affecter</button>
            </form>

            {c.assignments.length > 0 && (
              <table className="mt-4 w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="th">Participant</th>
                    <th className="th">Numéro national</th>
                    <th className="th">Date d&apos;affectation</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="td">
                        {a.trainee.lastName} {a.trainee.firstName}
                      </td>
                      <td className="td">{decryptSensitive(a.trainee.nationalNumber)}</td>
                      <td className="td">{formatDate(a.assignedDate)}</td>
                      <td className="td text-right">
                        <form action={removeAssignment}>
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <button className="text-xs text-red-600 hover:underline">
                            Retirer
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
