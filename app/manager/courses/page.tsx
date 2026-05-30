import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import {
  courseTypeLabel,
  formatDate,
  statusClasses,
  statusLabel,
} from "@/lib/format";
import { updateCourseAdmin } from "@/app/manager/_actions";

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
    where.topics = { some: { id: Number(searchParams.topicId) } };

  const [partners, topics, badges, courses] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.findMany({ orderBy: { id: "asc" } }),
    prisma.badge.findMany({ orderBy: { id: "asc" } }),
    prisma.course.findMany({
      where,
      orderBy: [{ partnerId: "asc" }, { title: "asc" }],
      include: {
        partner: true,
        sessions: { orderBy: { sequence: "asc" } },
        topics: true,
        badges: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="section-title">Tous les cours</h1>

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
          <label className="label">Population</label>
          <select name="population" defaultValue={searchParams.population ?? ""} className="input">
            <option value="">Toutes</option>
            <option value="POP1">Population 1</option>
            <option value="POP2">Population 2</option>
            <option value="UNSET">Non définie</option>
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
          <label className="label">Catalogue</label>
          <select name="visible" defaultValue={searchParams.visible ?? ""} className="input">
            <option value="">Tous</option>
            <option value="1">Visibles</option>
            <option value="0">Masqués</option>
          </select>
        </div>
        <div>
          <label className="label">Thème</label>
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
        <span className="ml-auto text-sm text-slate-500">{courses.length} cours</span>
      </form>

      <div className="space-y-4">
        {courses.map((c) => {
          const topicIds = new Set(c.topics.map((t) => t.id));
          const badgeIds = new Set(c.badges.map((b) => b.id));
          return (
            <form
              key={c.id}
              action={updateCourseAdmin}
              className="card space-y-4 p-5"
            >
              <input type="hidden" name="courseId" value={c.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-800">{c.title}</h2>
                    <span className={`badge-pill ${statusClasses(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {c.partner.name} · {courseTypeLabel(c.type, c.recurring)} ·{" "}
                    {c.sessions.length} session(s)
                    {c.sessions[0] && <> · à partir du {formatDate(c.sessions[0].date)}</>}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="label">Population</label>
                  <select
                    name="population"
                    defaultValue={c.population ?? ""}
                    className="input"
                  >
                    <option value="">Non définie</option>
                    <option value="POP1">Population 1</option>
                    <option value="POP2">Population 2</option>
                  </select>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="visibleInCatalogue"
                      defaultChecked={c.visibleInCatalogue}
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

              <div>
                <button className="btn-primary">Enregistrer</button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
