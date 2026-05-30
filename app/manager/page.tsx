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

  const [
    partners,
    courses,
    trainers,
    trainees,
    pop1,
    pop2,
    hidden,
    byTopic,
    byCategory,
    todo,
    drafts,
  ] = await Promise.all([
    prisma.partner.count(),
    prisma.course.count(),
    prisma.trainer.count(),
    prisma.trainee.count(),
    prisma.course.count({ where: { population: "POP1" } }),
    prisma.course.count({ where: { population: "POP2" } }),
    prisma.course.count({ where: { visibleInCatalogue: false } }),
    prisma.topic.findMany({
      include: { _count: { select: { primaryOf: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.category.findMany({
      include: { _count: { select: { primaryOf: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.course.count({
      where: { OR: [{ population: null }, { topicPrimaryId: null }] },
    }),
    prisma.course.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="section-title">Tableau de bord</h1>

      {todo > 0 && (
        <Link
          href="/manager/courses?todo=1"
          className="block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition-colors hover:bg-amber-100"
        >
          <span className="font-semibold">
            ⚠ {todo} activité{todo > 1 ? "s" : ""} à compléter
          </span>{" "}
          — catalogue, thèmes ou badges à définir. Cliquez pour les voir.
        </Link>
      )}

      {drafts > 0 && (
        <Link
          href="/manager/courses?status=DRAFT"
          className="block rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 transition-colors hover:bg-blue-100"
        >
          <span className="font-semibold">
            📝 {drafts} activité{drafts > 1 ? "s" : ""} en brouillon à valider
          </span>{" "}
          — à passer en « Ouvert ». Cliquez pour les voir.
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partenaires" value={partners} href="/manager/partners" />
        <Stat label="Activités" value={courses} href="/manager/courses" />
        <Stat label="Intervenants/Formateurs" value={trainers} href="/manager/trainers" />
        <Stat label="Participants" value={trainees} href="/manager/trainees" />
        <Stat
          label="Activités Catalogue principal"
          value={pop1}
          href="/manager/courses?population=POP1"
        />
        <Stat
          label="Activités Catalogue DPI"
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
        <h2 className="mb-3 font-semibold text-slate-800">
          Activités par type (principal)
        </h2>
        <div className="flex flex-wrap gap-2">
          {byTopic.map((t) => (
            <Link
              key={t.id}
              href={`/manager/courses?topicId=${t.id}`}
              className="badge-pill bg-indigo-100 text-indigo-700 transition-colors hover:bg-indigo-200"
            >
              {t.name}: {t._count.primaryOf}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">
          Activités par domaine de la loi (principal)
        </h2>
        <div className="flex flex-wrap gap-2">
          {byCategory.map((c) => (
            <Link
              key={c.id}
              href={`/manager/courses?categoryId=${c.id}`}
              className="badge-pill bg-teal-100 text-teal-700 transition-colors hover:bg-teal-200"
            >
              {c.name}: {c._count.primaryOf}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
