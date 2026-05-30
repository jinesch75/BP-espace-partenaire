import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import {
  courseTypeLabel,
  formatDate,
  populationLabel,
  statusClasses,
  statusLabel,
  STATUS_LABELS,
} from "@/lib/format";
import { setCourseStatus, deleteCourse } from "@/app/partner/_actions";
import { getTrainerConflicts } from "@/lib/conflicts";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "OPEN", "COMPLETED", "CANCELLED"] as const;

export default async function CourseDetail({
  params,
}: {
  params: { id: string };
}) {
  const partner = await requirePartner();
  const course = await prisma.course.findFirst({
    where: { id: Number(params.id), partnerId: partner.id },
    include: {
      sessions: { orderBy: { sequence: "asc" }, include: { trainer: true } },
      topics: true,
      badges: true,
      assignments: { include: { trainee: true } },
    },
  });
  if (!course) notFound();

  const conflicts = await getTrainerConflicts(course.id);

  return (
    <div className="space-y-6">
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Avertissement : double réservation d&apos;un formateur</p>
          <ul className="mt-1 list-disc pl-5">
            {conflicts.map((c, i) => (
              <li key={i}>
                {c.trainer} est aussi réservé pour « {c.otherCourse} » le {c.date} ({c.time}).
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <Link href="/partner" className="text-sm text-brand hover:underline">
          ← Retour à mes cours
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
          <span className={`badge-pill ${statusClasses(course.status)}`}>
            {statusLabel(course.status)}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {courseTypeLabel(course.type, course.recurring)} · {course.sessions.length}{" "}
          session{course.sessions.length > 1 ? "s" : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/partner/courses/${course.id}/edit`} className="btn-primary">
            Modifier le cours et les sessions
          </Link>
          <a href={`/courses/${course.id}/ics`} className="btn-secondary">
            Télécharger le calendrier (.ics)
          </a>
        </div>
      </div>

      {course.description && (
        <div className="card p-5 text-sm text-slate-700">{course.description}</div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">
          Défini par l&apos;administrateur
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge-pill bg-slate-100 text-slate-600">
            {populationLabel(course.population)}
          </span>
          <span
            className={`badge-pill ${
              course.visibleInCatalogue
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {course.visibleInCatalogue ? "Visible dans le catalogue" : "Masqué"}
          </span>
          {course.topics.map((t) => (
            <span key={t.id} className="badge-pill bg-indigo-100 text-indigo-700">
              {t.name}
            </span>
          ))}
          {course.badges.map((b) => (
            <span key={b.id} className="badge-pill bg-amber-100 text-amber-700">
              {b.name}
            </span>
          ))}
        </div>
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
              <th className="th">Places</th>
              <th className="th">Formateur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {course.sessions.map((s) => (
              <tr key={s.id}>
                <td className="td">{s.sequence}</td>
                <td className="td whitespace-nowrap">{formatDate(s.date)}</td>
                <td className="td whitespace-nowrap">
                  {s.startTime}–{s.endTime}
                </td>
                <td className="td">
                  {s.isOnline ? (
                    s.teamsLink ? (
                      <a
                        href={s.teamsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        En ligne (lien Teams)
                      </a>
                    ) : (
                      <span className="text-blue-600">En ligne</span>
                    )
                  ) : (
                    s.location
                  )}
                </td>
                <td className="td">{s.placesAvailable}</td>
                <td className="td">
                  {s.trainer
                    ? `${s.trainer.firstName} ${s.trainer.lastName}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {partner.managesTrainees && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold text-slate-800">
            Participants affectés ({course.assignments.length})
          </h2>
          {course.assignments.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucun pour l&apos;instant. Utilisez « Affecter des participants » pour
              les ajouter.
            </p>
          ) : (
            <ul className="text-sm text-slate-700">
              {course.assignments.map((a) => (
                <li key={a.id}>
                  {a.trainee.lastName} {a.trainee.firstName} —{" "}
                  {formatDate(a.assignedDate)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card flex flex-wrap items-end gap-4 p-5">
        <form action={setCourseStatus} className="flex items-end gap-2">
          <input type="hidden" name="courseId" value={course.id} />
          <div>
            <label className="label">Statut</label>
            <select name="status" defaultValue={course.status} className="input">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary">Mettre à jour le statut</button>
        </form>

        <form action={deleteCourse} className="ml-auto">
          <input type="hidden" name="courseId" value={course.id} />
          <button className="btn-danger">Supprimer le cours</button>
        </form>
      </div>
    </div>
  );
}
