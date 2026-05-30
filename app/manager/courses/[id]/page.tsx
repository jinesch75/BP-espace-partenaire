import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { courseTypeLabel, statusClasses, statusLabel } from "@/lib/format";
import {
  updateCourseAdmin,
  updateCourseDetails,
  deleteCourseAsManager,
} from "@/app/manager/_actions";
import EditCourseForm from "@/app/partner/courses/[id]/edit/EditCourseForm";

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
      topics: true,
      badges: true,
    },
  });
  if (!course) notFound();

  const [topics, badges, trainers] = await Promise.all([
    prisma.topic.findMany({ orderBy: { id: "asc" } }),
    prisma.badge.findMany({ orderBy: { id: "asc" } }),
    prisma.trainer.findMany({
      where: { partnerId: course.partnerId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const topicIds = new Set(course.topics.map((t) => t.id));
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
          ← Retour à tous les cours
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
          Veuillez saisir un titre de cours.
        </div>
      )}

      {/* Champs administrateur */}
      <form action={updateCourseAdmin} className="card space-y-4 p-5">
        <h2 className="font-semibold text-slate-800">Champs administrateur</h2>
        <input type="hidden" name="courseId" value={course.id} />
        <div className="grid gap-4 lg:grid-cols-3">
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
          </div>
          <div>
            <span className="label">Thèmes</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {topics.map((t) => (
                <label key={t.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    name="topicIds"
                    value={t.id}
                    defaultChecked={topicIds.has(t.id)}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
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
        <button className="btn-primary">Enregistrer les champs administrateur</button>
      </form>

      {/* Détails du cours */}
      <div>
        <h2 className="section-title mb-3 text-xl">Détails du cours</h2>
        <EditCourseForm
          course={{ id: course.id, title: course.title, description: course.description }}
          sessions={sessions}
          trainers={trainers}
          action={updateCourseDetails}
          cancelHref="/manager/courses"
        />
      </div>

      {/* Supprimer le cours */}
      <div className="card flex flex-wrap items-center gap-3 border-red-100 p-5">
        <form action={deleteCourseAsManager}>
          <input type="hidden" name="courseId" value={course.id} />
          <button className="btn-danger">Supprimer le cours</button>
        </form>
        <span className="text-xs text-slate-400">
          Supprime définitivement ce cours, ses sessions et les affectations de
          participants.
        </span>
      </div>
    </div>
  );
}
