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
        <h1 className="text-2xl font-bold text-slate-800">Assign trainees</h1>
        <p className="text-sm text-slate-500">
          {partner.name} · add trainees from the database to a course. Places
          left is shown per session.
        </p>
      </div>

      {trainees.length === 0 && (
        <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700">
          The trainee database is empty. It is populated later via the Biergerpakt
          interconnection.
        </div>
      )}

      {courses.map((c) => {
        const assignedCount = c.assignments.length;
        return (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-800">{c.title}</h2>
              <span className="text-sm text-slate-500">
                {assignedCount} trainee{assignedCount === 1 ? "" : "s"} assigned
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {c.sessions.map((s) => (
                <span
                  key={s.id}
                  className="badge-pill bg-slate-100 text-slate-600"
                >
                  {formatDate(s.date)} · {Math.max(0, s.placesAvailable - assignedCount)}/
                  {s.placesAvailable} left
                </span>
              ))}
            </div>

            <form action={assignTrainee} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="courseId" value={c.id} />
              <div className="min-w-[260px]">
                <label className="label">Add a trainee</label>
                <select name="traineeId" className="input" required>
                  <option value="">— select a trainee —</option>
                  {trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.lastName} {t.firstName} ({decryptSensitive(t.nationalNumber)})
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary">Assign</button>
            </form>

            {c.assignments.length > 0 && (
              <table className="mt-4 w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">Trainee</th>
                    <th className="th">National number</th>
                    <th className="th">Assigned date</th>
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
                            Remove
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
