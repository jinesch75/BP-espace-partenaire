import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { courseTypeLabel, formatDate, statusClasses, statusLabel } from "@/lib/format";
import {
  updateCourseAdmin,
  updateCourseDetails,
  deleteCourseAsManager,
} from "@/app/manager/_actions";
import EditCourseForm from "@/app/partner/courses/[id]/edit/EditCourseForm";
import { PresenceControls } from "@/app/_components/PresenceControls";
import { SaveButton } from "@/app/_components/SaveButton";
import { TaxonomySelectors } from "@/app/_components/TaxonomySelectors";

export const dynamic = "force-dynamic";

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function ManagerCourseDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  requireManager();
  const course = await prisma.course.findUnique({
    where: { id: Number(params.id) },
    include: {
      partner: true,
      sessions: { orderBy: { sequence: "asc" } },
      badges: true,
      assignments: {
        include: { trainee: true },
        orderBy: [{ assignedDate: "asc" }],
      },
    },
  });
  if (!course) notFound();

  const [topics, categories, badges, trainers] = await Promise.all([
    prisma.topic.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.badge.findMany({ orderBy: { id: "asc" } }),
    prisma.trainer.findMany({
      where: { partnerId: course.partnerId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const badgeIds = new Set(course.badges.map((b) => b.id));

  const sessions = course.sessions.map((s) => ({
    id: s.id,
    date: toDateInput(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    isOnline: s.isOnline,
    location: s.location,
    teamsLink: s.teamsLink,
    placesAvailable: s.placesAvailable,
    trainerId: s.trainerId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/manager/courses" className="text-sm text-brand hover:underline">
          ← Retour à toutes les activités
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
          <span className={`badge-pill ${statusClasses(course.status)}`}>
            {statusLabel(course.status)}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {course.partner.name} · {courseTypeLabel(course.type, course.recurring)} ·{" "}
          {course.sessions.length} session(s)
        </p>
      </div>

      {searchParams.error === "title" && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez saisir un titre d'activité.
        </div>
      )}

      {/* Champs administrateur */}
      <form action={updateCourseAdmin} className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-800">Champs administrateur</h2>
        <input type="hidden" name="courseId" value={course.id} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Catalogue</label>
            <select name="population" defaultValue={course.population ?? ""} className="input">
              <option value="">Non défini</option>
              <option value="POP1">Catalogue principal</option>
              <option value="POP2">Catalogue DPI</option>
            </select>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="visibleInCatalogue"
                defaultChecked={course.visibleInCatalogue}
              />
              Visible dans le catalogue
            </label>

            <label className="label mt-3">Statut</label>
            <select name="status" defaultValue={course.status} className="input">
              <option value="DRAFT">Brouillon</option>
              <option value="OPEN">Ouvert</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <TaxonomySelectors topics={topics} categories={categories} course={course} />
          <div>
            <span className="label">Badges</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {badges.map((b) => (
                <label key={b.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="badgeIds"
                    value={b.id}
                    defaultChecked={badgeIds.has(b.id)}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <SaveButton>Enregistrer les champs administrateur</SaveButton>
      </form>

      {/* Détails de l'activité */}
      <div>
        <h2 className="section-title mb-3 text-xl">Détails de l'activité</h2>
        <EditCourseForm
          course={{ id: course.id, title: course.title, description: course.description }}
          sessions={sessions}
          trainers={trainers}
          action={updateCourseDetails}
          cancelHref="/manager/courses"
        />
      </div>

      {/* Participants et présence */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
          Participants ({course.assignments.length}) — présence
        </div>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Supprimer l'activité */}
      <div className="card flex flex-wrap items-center gap-3 border-red-100 p-5">
        <form action={deleteCourseAsManager}>
          <input type="hidden" name="courseId" value={course.id} />
          <button className="btn-danger">Supprimer l'activité</button>
        </form>
        <span className="text-xs text-slate-400">
          Supprime définitivement cette activité, ses sessions et les affectations de
          participants.
        </span>
      </div>
    </div>
  );
}
