import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="text-3xl font-bold text-brand">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="card block p-5 transition-colors hover:border-brand hover:shadow"
      >
        {inner}
      </Link>
    );
  }
  return <div className="card p-5">{inner}</div>;
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
        <Stat label="Partenaires" value={partners} href="/manager/partners" />
        <Stat label="Cours" value={courses} href="/manager/courses" />
        <Stat label="Formateurs" value={trainers} href="/manager/trainers" />
        <Stat label="Participants" value={trainees} href="/manager/trainees" />
        <Stat
          label="Cours Catalogue principal"
          value={pop1}
          href="/manager/courses?population=POP1"
        />
        <Stat
          label="Cours Catalogue DPI"
          value={pop2}
          href="/manager/courses?population=POP2"
        />
        <Stat
          label="Masqués du catalogue"
          value={hidden}
          href="/manager/courses?visible=0"
        />
        <Stat
          label="Visibles dans le catalogue"
          value={courses - hidden}
          href="/manager/courses?visible=1"
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Cours par thème</h2>
        <div className="flex flex-wrap gap-2">
          {byTopic.map((t) => (
            <Link
              key={t.id}
              href={`/manager/courses?topicId=${t.id}`}
              className="badge-pill bg-indigo-100 text-indigo-700 transition-colors hover:bg-indigo-200"
            >
              {t.name}: {t._count.courses}
            </Link>
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
