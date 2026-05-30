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
import {
  setCourseStatus,
  deleteCourse,
  assignTrainee,
  removeAssignment,
} from "@/app/partner/_actions";
import { getTrainerConflicts } from "@/lib/conflicts";
import { PresenceControls } from "@/app/_components/PresenceControls";
import { SaveButton } from "@/app/_components/SaveButton";
import { decryptSensitive } from "@/lib/crypto";

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

  // ONA (and any partner that can assign participants) gets the add control
  const trainees = partner.managesTrainees
    ? await prisma.trainee.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      })
    : [];

  return (
    <div className="space-y-6">
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Avertissement : double réservation d&apos;un intervenant</p>
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
          ← Retour à mes activités
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
            Modifier l'activité et les sessions
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
              <th className="th">Intervenant</th>
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

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
          Participants ({course.assignments.length}) — présence
        </div>

        {partner.managesTrainees && (
          <form
            action={assignTrainee}
            className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-5 py-4"
          >
            <input type="hidden" name="courseId" value={course.id} />
            <div className="min-w-[280px]">
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
            <SaveButton>Ajouter des participants</SaveButton>
          </form>
        )}

        {course.assignments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">
            Aucun participant pour l&apos;instant.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <th className="th">Participant</th>
                <th className="th">Date</th>
                <th className="th">Présence</th>
                {partner.managesTrainees && <th className="th"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {course.assignments.map((a) => (
                <tr key={a.id}>
                  <td className="td">
                    {a.trainee.lastName} {a.trainee.firstName}
                  </td>
                  <td className="td whitespace-nowrap">{formatDate(a.assignedDate)}</td>
                  <td className="td">
                    <PresenceControls assignmentId={a.id} presence={a.presence} />
                  </td>
                  {partner.managesTrainees && (
                    <td className="td text-right">
                      <form action={removeAssignment}>
                        <input type="hidden" name="assignmentId" value={a.id} />
                        <button className="text-xs text-red-600 hover:underline">
                          Retirer
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
          <SaveButton>Mettre à jour le statut</SaveButton>
        </form>

        <form action={deleteCourse} className="ml-auto">
          <input type="hidden" name="courseId" value={course.id} />
          <button className="btn-danger">Supprimer l'activité</button>
        </form>
      </div>
    </div>
  );
}
