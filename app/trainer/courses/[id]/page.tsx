import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/session";
import { courseTypeLabel, formatDate } from "@/lib/format";

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
      topics: true,
      badges: true,
      assignments: { include: { trainee: true } },
    },
  });
  if (!course) notFound();

  const registered = course.assignments.length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trainer" className="text-sm text-brand hover:underline">
          ← Back to my courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">{course.title}</h1>
        <p className="text-sm text-slate-500">
          {course.partner.name} · {courseTypeLabel(course.type, course.recurring)}
        </p>
        <div className="mt-3">
          <a href={`/courses/${course.id}/ics`} className="btn-secondary">
            Download calendar (.ics)
          </a>
        </div>
      </div>

      {course.description && (
        <div className="card p-5 text-sm text-slate-700">{course.description}</div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
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

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
          Sessions
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">#</th>
              <th className="th">Date</th>
              <th className="th">Time</th>
              <th className="th">Where</th>
              <th className="th">Places left</th>
              <th className="th">Trainer</th>
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
                      s.teamsLink ? (
                        <a
                          href={s.teamsLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Online (Teams)
                        </a>
                      ) : (
                        "Online"
                      )
                    ) : (
                      s.location
                    )}
                  </td>
                  <td className="td">
                    {Math.max(0, s.placesAvailable - registered)}/{s.placesAvailable}
                  </td>
                  <td className="td">
                    {s.trainer
                      ? `${s.trainer.firstName} ${s.trainer.lastName}`
                      : "—"}
                    {mine && (
                      <span className="badge-pill ml-1 bg-brand-light text-brand">
                        you
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-800">
          Registered trainees ({registered})
        </h2>
        {registered === 0 ? (
          <p className="text-sm text-slate-500">
            No one registered yet. For most partners, registrations arrive once
            the external system is connected.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Family name</th>
                <th className="th">First name</th>
                <th className="th">Registered date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {course.assignments.map((a) => (
                <tr key={a.id}>
                  <td className="td">{a.trainee.lastName}</td>
                  <td className="td">{a.trainee.firstName}</td>
                  <td className="td">{formatDate(a.assignedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
