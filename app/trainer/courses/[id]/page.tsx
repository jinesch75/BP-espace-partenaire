import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/session";
import { courseTypeLabel, formatDate } from "@/lib/format";
import { AttendanceGrid } from "@/app/_components/AttendanceGrid";
import { TaxonomyPills, taxonomyInclude } from "@/app/_components/TaxonomyPills";

export const dynamic = "force-dynamic";

export default async function TrainerCourseDetail({
  params,
}: {
  params: { id: string };
}) {
  const trainer = await requireTrainer();
  const course = await prisma.course.findFirst({
    where: {
      id: Number(params.id),
      sessions: { some: { trainerId: trainer.id } },
    },
    include: {
      partner: true,
      sessions: { orderBy: { sequence: "asc" }, include: { trainer: true } },
      ...taxonomyInclude,
      badges: true,
      assignments: { include: { trainee: true } },
    },
  });
  if (!course) notFound();

  const registered = course.assignments.length;

  const attRows = await prisma.attendance.findMany({
    where: {
      sessionId: { in: course.sessions.map((s) => s.id) },
      traineeId: { in: course.assignments.map((a) => a.traineeId) },
    },
  });
  const attendance: Record<string, string> = {};
  for (const r of attRows) attendance[`${r.traineeId}-${r.sessionId}`] = r.status;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trainer" className="text-sm text-brand hover:underline">
          ← Retour à mes activités
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">{course.title}</h1>
        <p className="text-sm text-slate-500">
          {course.partner.name} · {courseTypeLabel(course.type, course.recurring)}
        </p>
        <div className="mt-3">
          <a href={`/courses/${course.id}/ics`} className="btn-secondary">
            Télécharger le calendrier (.ics)
          </a>
        </div>
      </div>

      {course.description && (
        <div className="card p-5 text-sm text-slate-700">{course.description}</div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <TaxonomyPills course={course} />
        {course.badges.map((b) => (
          <span key={b.id} className="badge-pill bg-amber-100 text-amber-700">
            {b.name}
          </span>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
          Sessions
        </div>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="th">#</th>
              <th className="th">Date</th>
              <th className="th">Heure</th>
              <th className="th">Lieu</th>
              <th className="th">Inscrits / max</th>
              <th className="th">Intervenant/Formateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {course.sessions.map((s) => {
              const mine = s.trainerId === trainer.id;
              return (
                <tr key={s.id} className={mine ? "bg-brand-light/40" : ""}>
                  <td className="td">{s.sequence}</td>
                  <td className="td whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="td whitespace-nowrap">
                    {s.startTime}–{s.endTime}
                  </td>
                  <td className="td">
                    {s.isOnline ? (
                      <span>
                        <span className="font-medium text-blue-600">En ligne</span>
                        {s.teamsLink && (
                          <>
                            {" — "}
                            <a
                              href={s.teamsLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              lien Teams
                            </a>
                          </>
                        )}
                      </span>
                    ) : (
                      s.location || <span className="text-slate-400">Lieu non précisé</span>
                    )}
                  </td>
                  <td className="td whitespace-nowrap">
                    {registered} / {s.placesAvailable}
                  </td>
                  <td className="td">
                    {s.trainer
                      ? `${s.trainer.firstName} ${s.trainer.lastName}`
                      : "—"}
                    {mine && (
                      <span className="badge-pill ml-1 bg-brand-light text-brand">
                        vous
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
          Participants inscrits ({registered}) — présence par séance
        </div>
        <AttendanceGrid
          sessions={course.sessions.map((s) => ({
            id: s.id,
            sequence: s.sequence,
            date: s.date,
          }))}
          participants={course.assignments.map((a) => ({
            assignmentId: a.id,
            traineeId: a.traineeId,
            lastName: a.trainee.lastName,
            firstName: a.trainee.firstName,
          }))}
          attendance={attendance}
        />
      </div>
    </div>
  );
}
