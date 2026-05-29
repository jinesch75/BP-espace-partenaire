import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import {
  courseTypeLabel,
  formatDate,
  populationLabel,
  statusClasses,
} from "@/lib/format";
import { duplicateCourse } from "@/app/partner/_actions";

export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const partner = await requirePartner();
  const courses = await prisma.course.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { sequence: "asc" }, include: { trainer: true } },
      topics: true,
      badges: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My courses</h1>
          <p className="text-sm text-slate-500">{partner.name}</p>
        </div>
        <Link href="/partner/courses/new" className="btn-primary">
          + New course
        </Link>
      </div>

      {courses.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          No courses yet. Create your first one.
        </div>
      )}

      <div className="space-y-4">
        {courses.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {c.title}
                  </h2>
                  <span
                    className={`badge-pill ${statusClasses(c.status)}`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {courseTypeLabel(c.type, c.recurring)} · {c.sessions.length}{" "}
                  session{c.sessions.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/partner/courses/${c.id}`} className="btn-secondary">
                  Open
                </Link>
                <form action={duplicateCourse}>
                  <input type="hidden" name="courseId" value={c.id} />
                  <button className="btn-secondary">Duplicate</button>
                </form>
              </div>
            </div>

            {c.description && (
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="badge-pill bg-slate-100 text-slate-600">
                {populationLabel(c.population)} (set by manager)
              </span>
              <span
                className={`badge-pill ${
                  c.visibleInCatalogue
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {c.visibleInCatalogue ? "Visible in catalogue" : "Hidden"}
              </span>
              {c.topics.map((t) => (
                <span key={t.id} className="badge-pill bg-indigo-100 text-indigo-700">
                  {t.name}
                </span>
              ))}
              {c.badges.map((b) => (
                <span key={b.id} className="badge-pill bg-amber-100 text-amber-700">
                  {b.name}
                </span>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Date</th>
                    <th className="th">Time</th>
                    <th className="th">Where</th>
                    <th className="th">Places</th>
                    <th className="th">Trainer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="td">{s.sequence}</td>
                      <td className="td whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="td whitespace-nowrap">
                        {s.startTime}–{s.endTime}
                      </td>
                      <td className="td">
                        {s.isOnline ? (
                          <span className="text-blue-600">Online</span>
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
          </div>
        ))}
      </div>
    </div>
  );
}
