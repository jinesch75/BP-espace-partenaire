import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { updateProgramme } from "@/app/manager/_actions";
import { SaveButton } from "@/app/_components/SaveButton";
import { TaxonomySelectors } from "@/app/_components/TaxonomySelectors";

export const dynamic = "force-dynamic";

const DPI_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— aucune —" },
  { value: "DAPA1", label: "DAPA 1" },
  { value: "DAPA2", label: "DAPA 2" },
  { value: "DAPA3", label: "DAPA 3" },
  { value: "DAPA4", label: "DAPA 4" },
  { value: "DAPA5", label: "DAPA 5" },
  { value: "BIENV", label: "Bienvenue" },
];

export default async function ManagerProgrammes() {
  requireManager();
  const [programmes, topics, categories, badges] = await Promise.all([
    prisma.programme.findMany({
      orderBy: [{ partnerId: "asc" }, { name: "asc" }],
      include: { partner: true, _count: { select: { courses: true } } },
    }),
    prisma.topic.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.badge.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Programmes</h1>
        <p className="text-sm text-slate-500">
          Définissez ici les informations partagées d&apos;un programme (catalogue,
          type, domaine de la loi, badges, étape DPI). Toutes ses éditions en
          héritent automatiquement.
        </p>
      </div>

      <div className="space-y-4">
        {programmes.map((p) => {
          const badgeSet = new Set(p.badgeIds);
          return (
            <form key={p.id} action={updateProgramme} className="card space-y-4 p-5">
              <input type="hidden" name="programmeId" value={p.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">{p.name}</h2>
                  {p.dpiStep && (
                    <span className="badge-pill bg-amber-100 text-amber-700">
                      DPI : {p.dpiStep}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {p.partner.name} · {p._count.courses} édition(s)
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Nom du programme</label>
                  <input name="name" className="input" defaultValue={p.name} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description (commune à toutes les éditions)</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    defaultValue={p.description ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div>
                    <label className="label">Catalogue</label>
                    <select name="population" defaultValue={p.population ?? ""} className="input">
                      <option value="">Non défini</option>
                      <option value="POP1">Catalogue principal</option>
                      <option value="POP2">Catalogue DPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Étape DPI</label>
                    <select name="dpiStep" defaultValue={p.dpiStep ?? ""} className="input">
                      {DPI_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="visibleInCatalogue"
                      defaultChecked={p.visibleInCatalogue}
                    />
                    Visible dans le catalogue
                  </label>
                </div>

                <TaxonomySelectors topics={topics} categories={categories} course={p} />

                <div>
                  <span className="label">Badges</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {badges.map((b) => (
                      <label key={b.id} className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          name="badgeIds"
                          value={b.id}
                          defaultChecked={badgeSet.has(b.id)}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <SaveButton>Enregistrer (et propager aux éditions)</SaveButton>
            </form>
          );
        })}
      </div>
    </div>
  );
}
