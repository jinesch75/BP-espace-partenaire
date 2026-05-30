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
      <h1 className="section-title">Tableau de bord</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partenaires" value={partners} />
        <Stat label="Cours" value={courses} />
        <Stat label="Formateurs" value={trainers} />
        <Stat label="Participants" value={trainees} />
        <Stat label="Cours population 1" value={pop1} />
        <Stat label="Cours population 2" value={pop2} />
        <Stat label="Masqués du catalogue" value={hidden} />
        <Stat label="Visibles dans le catalogue" value={courses - hidden} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Cours par thème</h2>
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
          Gérer les partenaires
        </Link>
        <Link href="/manager/courses" className="btn-secondary">
          Gérer tous les cours
        </Link>
        <Link href="/manager/trainees" className="btn-secondary">
          Base des participants
        </Link>
        <a href="/manager/export" className="btn-secondary">
          Exporter vers Excel
        </a>
      </div>
    </div>
  );
}
