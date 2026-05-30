import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import {
  courseTypeLabel,
  formatDate,
  statusClasses,
  statusLabel,
} from "@/lib/format";
import { updateCourseAdmin } from "@/app/manager/_actions";
import { SaveButton } from "@/app/_components/SaveButton";
import { TaxonomySelectors } from "@/app/_components/TaxonomySelectors";

export const dynamic = "force-dynamic";

export default async function ManagerCourses({
  searchParams,
}: {
  searchParams: {
    partnerId?: string;
    population?: string;
    status?: string;
    visible?: string;
    topicId?: string;
    categoryId?: string;
    todo?: string;
  };
}) {
  requireManager();

  const where: any = {};
  if (searchParams.partnerId) where.partnerId = Number(searchParams.partnerId);
  if (searchParams.population === "UNSET") where.population = null;
  else if (searchParams.population) where.population = searchParams.population;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.visible === "1") where.visibleInCatalogue = true;
  else if (searchParams.visible === "0") where.visibleInCatalogue = false;
  if (searchParams.topicId)
    where.topicPrimaryId = Number(searchParams.topicId);
  if (searchParams.categoryId)
    where.categoryPrimaryId = Number(searchParams.categoryId);
  if (searchParams.todo === "1")
    where.OR = [{ population: null }, { topicPrimaryId: null }];

  const [partners, topics, categories, badges, courses] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.badge.findMany({ orderBy: { id: "asc" } }),
    prisma.course.findMany({
      where,
      include: {
        partner: true,
        programme: { select: { id: true, name: true } },
        sessions: { orderBy: { sequence: "asc" } },
        badges: true,
      },
    }),
  ]);

  // first-session timestamp (Infinity if no session yet → sorts last)
  const firstDate = (c: (typeof courses)[number]) =>
    c.sessions[0] ? new Date(c.sessions[0].date).getTime() : Infinity;

  // group éditions by programme (fallback: by title)
  const groupsMap = new Map<
    string,
    { label: string; items: typeof courses }
  >();
  for (const c of courses) {
    const key = c.programme ? `p${c.programme.id}` : `t${c.title}`;
    const label = c.programme?.name ?? c.title;
    if (!groupsMap.has(key)) groupsMap.set(key, { label, items: [] });
    groupsMap.get(key)!.items.push(c);
  }
  const groups = [...groupsMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  for (const g of groups) g.items.sort((a, b) => firstDate(a) - firstDate(b));

  return (
    <div className="space-y-6">
      <h1 className="section-title">Toutes les activités</h1>

      {searchParams.todo === "1" &&
        (courses.length > 0 ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {courses.length} activité{courses.length > 1 ? "s" : ""} à compléter :
            il manque le catalogue et/ou un thème. Définissez le catalogue, les
            thèmes et les badges, puis enregistrez.
          </div>
        ) : (
          <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ Toutes les activités sont complètes — rien à compléter.{" "}
            <a href="/manager/courses" className="font-semibold underline">
              Voir toutes les activités
            </a>
          </div>
        ))}

      {/* Filtres */}
      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label">Partenaire</label>
          <select name="partnerId" defaultValue={searchParams.partnerId ?? ""} className="input">
            <option value="">Tous</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Catalogue</label>
          <select name="population" defaultValue={searchParams.population ?? ""} className="input">
            <option value="">Tous</option>
            <option value="POP1">Catalogue principal</option>
            <option value="POP2">Catalogue DPI</option>
            <option value="UNSET">Non défini</option>
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input">
            <option value="">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="OPEN">Ouvert</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>
        <div>
          <label className="label">Visibilité</label>
          <select name="visible" defaultValue={searchParams.visible ?? ""} className="input">
            <option value="">Tous</option>
            <option value="1">Visibles</option>
            <option value="0">Masqués</option>
          </select>
        </div>
        <div>
          <label className="label">Type d&apos;activité</label>
          <select name="topicId" defaultValue={searchParams.topicId ?? ""} className="input">
            <option value="">Tous</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">Filtrer</button>
        <span className="ml-auto text-sm text-slate-500">{courses.length} activités</span>
      </form>

      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.label} className="space-y-3">
            <h2 className="text-lg font-bold text-slate-700">
              {g.label}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({g.items.length} édition{g.items.length > 1 ? "s" : ""})
              </span>
            </h2>
            {g.items.map((c) => {
          const badgeIds = new Set(c.badges.map((b) => b.id));
          return (
            <form
              key={c.id}
              action={updateCourseAdmin}
              className="card space-y-4 p-5"
            >
              <input type="hidden" name="courseId" value={c.id} />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-800">{c.title}</h2>
                    <span className={`badge-pill ${statusClasses(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                    {(!c.population || !c.topicPrimaryId) && (
                      <span className="badge-pill bg-amber-100 text-amber-700">
                        À compléter
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.partner.name} · {courseTypeLabel(c.type, c.recurring)} ·{" "}
                    {c.sessions.length} session(s)
                    {c.sessions[0] && <> · à partir du {formatDate(c.sessions[0].date)}</>}
                  </p>
                </div>
                <Link href={`/manager/courses/${c.id}`} className="btn-secondary">
                  Ouvrir l'activité
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Catalogue</label>
                  <select
                    name="population"
                    defaultValue={c.population ?? ""}
                    className="input"
                  >
                    <option value="">Non défini</option>
                    <option value="POP1">Catalogue principal</option>
                    <option value="POP2">Catalogue DPI</option>
                  </select>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="visibleInCatalogue"
                      defaultChecked={c.visibleInCatalogue}
                    />
                    Visible dans le catalogue
                  </label>

                  <label className="label mt-3">Statut</label>
                  <select name="status" defaultValue={c.status} className="input">
                    <option value="DRAFT">Brouillon</option>
                    <option value="OPEN">Ouvert</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>

                <TaxonomySelectors topics={topics} categories={categories} course={c} />

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

              <div>
                <SaveButton>Enregistrer</SaveButton>
              </div>
            </form>
          );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
