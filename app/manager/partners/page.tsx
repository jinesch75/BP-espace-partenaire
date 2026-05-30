import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { updatePartner, deletePartner } from "@/app/manager/_actions";

export const dynamic = "force-dynamic";

export default async function ManagerPartners() {
  requireManager();
  const partners = await prisma.partner.findMany({
    orderBy: [{ managesTrainees: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { courses: true, trainers: true } },
      trainers: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      courses: {
        include: { sessions: { select: { date: true } } },
        orderBy: { title: "asc" },
      },
    },
  });

  const now = Date.now();
  function splitCourses(courses: (typeof partners)[number]["courses"]) {
    const upcoming: string[] = [];
    const past: string[] = [];
    for (const c of courses) {
      const last = c.sessions.length
        ? Math.max(...c.sessions.map((s) => new Date(s.date).getTime()))
        : 0;
      if (last >= now || c.sessions.length === 0) upcoming.push(c.title);
      else past.push(c.title);
    }
    return { upcoming, past };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">Partenaires</h1>
          <p className="text-sm text-slate-500">
            Modifiez les informations générales de chaque partenaire, ou
            supprimez-le. Les coordonnées s&apos;affichent en haut de la page du
            partenaire concerné.
          </p>
        </div>
        <Link href="/manager/partners/new" className="btn-primary">
          + Ajouter un partenaire
        </Link>
      </div>

      <div className="space-y-4">
        {partners.map((p) => {
          const { upcoming, past } = splitCourses(p.courses);
          return (
          <div key={p.id} className="card p-5">
            <form action={updatePartner} className="space-y-4">
              <input type="hidden" name="partnerId" value={p.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">{p.name}</h2>
                  {p.managesTrainees && (
                    <span className="badge-pill bg-amber-100 text-amber-700">Rôle DPI</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {p._count.courses} cours · {p._count.trainers} formateurs
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nom du partenaire</label>
                  <input name="name" className="input" defaultValue={p.name} />
                </div>
                <div>
                  <label className="label">E-mail de contact</label>
                  <input
                    name="contactEmail"
                    type="email"
                    className="input"
                    defaultValue={p.contactEmail ?? ""}
                  />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input name="phone" className="input" defaultValue={p.phone ?? ""} />
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <input name="address" className="input" defaultValue={p.address ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    defaultValue={p.description ?? ""}
                  />
                </div>
              </div>

              <button className="btn-primary">Enregistrer les modifications</button>
            </form>

            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
              <div>
                <p className="label mb-1">Formateurs ({p.trainers.length})</p>
                {p.trainers.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun formateur.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.trainers.map((t) => (
                      <span
                        key={t.id}
                        className="badge-pill bg-slate-100 text-slate-600"
                      >
                        {t.firstName} {t.lastName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="label mb-1">Cours ({p._count.courses})</p>
                <p className="text-xs font-semibold text-slate-500">À venir</p>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun.</p>
                ) : (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {upcoming.map((title, i) => (
                      <span key={i} className="badge-pill bg-green-100 text-green-700">
                        {title}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs font-semibold text-slate-500">Passés</p>
                {past.length === 0 ? (
                  <p className="text-xs text-slate-400">Aucun.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {past.map((title, i) => (
                      <span key={i} className="badge-pill bg-slate-100 text-slate-500">
                        {title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form
              action={deletePartner}
              className="mt-4 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="partnerId" value={p.id} />
              <button className="btn-danger">Supprimer ce partenaire</button>
              <span className="ml-2 text-xs text-slate-400">
                Supprime aussi les cours, sessions et formateurs de ce partenaire.
              </span>
            </form>
          </div>
          );
        })}
      </div>
    </div>
  );
}
