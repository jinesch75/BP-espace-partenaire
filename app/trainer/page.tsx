import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/session";
import { courseTypeLabel, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TrainerHome() {
  const trainer = await requireTrainer();

  const courses = await prisma.course.findMany({
    where: { sessions: { some: { trainerId: trainer.id } } },
    include: {
      partner: true,
      sessions: {
        where: { trainerId: trainer.id },
        orderBy: { date: "asc" },
      },
      _count: { select: { assignments: true } },
    },
  });

  const now = new Date();
  const withMeta = courses.map((c) => {
    const dates = c.sessions.map((s) => new Date(s.date).getTime());
    const lastDate = Math.max(...dates);
    return { c, lastDate, upcoming: lastDate >= now.getTime() };
  });
  const upcoming = withMeta
    .filter((x) => x.upcoming)
    .sort((a, b) => a.lastDate - b.lastDate);
  const past = withMeta
    .filter((x) => !x.upcoming)
    .sort((a, b) => b.lastDate - a.lastDate);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title">Mes activités</h1>
        <p className="text-sm text-slate-500">
          {trainer.firstName} {trainer.lastName} · {trainer.partner.name}
        </p>
      </div>

      <Section title="À venir" items={upcoming} />
      <Section title="Passés" items={past} muted />
    </div>
  );
}

function Section({
  title,
  items,
  muted,
}: {
  title: string;
  items: { c: any; upcoming: boolean }[];
  muted?: boolean;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-700">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Rien ici.</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ c }) => (
            <Link
              key={c.id}
              href={`/trainer/courses/${c.id}`}
              className={`card block p-4 hover:border-brand hover:shadow ${
                muted ? "opacity-80" : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{c.title}</span>
                <span className="text-xs text-slate-500">
                  {c._count.assignments} inscrit{c._count.assignments === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {c.partner.name} · {courseTypeLabel(c.type, c.recurring)} ·{" "}
                {c.sessions.length} session(s) que vous animez
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {c.sessions.map((s: any) => (
                  <span
                    key={s.id}
                    className="badge-pill bg-slate-100 text-slate-600"
                  >
                    {formatDate(s.date)} · {s.startTime}–{s.endTime} ·{" "}
                    {s.isOnline ? "En ligne" : s.location || "Lieu non précisé"} ·{" "}
                    {s.placesAvailable} places
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
