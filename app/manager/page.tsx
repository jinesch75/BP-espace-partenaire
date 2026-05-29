import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-5">
      <div className="text-3xl font-bold text-brand">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default async function ManagerHome() {
  requireManager();

  const [partners, courses, trainers, trainees, pop1, pop2, hidden, byTopic] =
    await Promise.all([
      prisma.partner.count(),
      prisma.course.count(),
      prisma.trainer.count(),
      prisma.trainee.count(),
      prisma.course.count({ where: { population: "POP1" } }),
      prisma.course.count({ where: { population: "POP2" } }),
      prisma.course.count({ where: { visibleInCatalogue: false } }),
      prisma.topic.findMany({
        include: { _count: { select: { courses: true } } },
        orderBy: { id: "asc" },
      }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Manager dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partners" value={partners} />
        <Stat label="Courses" value={courses} />
        <Stat label="Trainers" value={trainers} />
        <Stat label="Trainees" value={trainees} />
        <Stat label="Population 1 courses" value={pop1} />
        <Stat label="Population 2 courses" value={pop2} />
        <Stat label="Hidden from catalogue" value={hidden} />
        <Stat label="Visible in catalogue" value={courses - hidden} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Courses per topic</h2>
        <div className="flex flex-wrap gap-2">
          {byTopic.map((t) => (
            <span
              key={t.id}
              className="badge-pill bg-indigo-100 text-indigo-700"
            >
              {t.name}: {t._count.courses}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/manager/partners" className="btn-primary">
          Manage partners
        </Link>
        <Link href="/manager/courses" className="btn-secondary">
          Manage all courses
        </Link>
        <Link href="/manager/trainees" className="btn-secondary">
          Trainee database
        </Link>
        <a href="/manager/export" className="btn-secondary">
          Export to Excel
        </a>
      </div>
    </div>
  );
}
