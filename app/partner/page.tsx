import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import {
  courseTypeLabel,
  formatDate,
  populationLabel,
  statusClasses,
  statusLabel,
} from "@/lib/format";
import { TaxonomyPills, taxonomyInclude } from "@/app/_components/TaxonomyPills";
import { PartnerInfo } from "@/app/_components/PartnerInfo";

export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const partner = await requirePartner();
  const courses = await prisma.course.findMany({
    where: { partnerId: partner.id },
    include: {
      sessions: { orderBy: { sequence: "asc" }, include: { trainer: true } },
      ...taxonomyInclude,
      badges: true,
      programme: { select: { id: true, name: true } },
    },
  });

  // group éditions by programme (fallback: title), sort by first séance date
  const firstDate = (c: (typeof courses)[number]) =>
    c.sessions[0] ? new Date(c.sessions[0].date).getTime() : Infinity;
  const groupsMap = new Map<string, { label: string; items: typeof courses }>();
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
      <PartnerInfo
        partner={{
          name: partner.name,
          description: partner.description,
          contactEmail: partner.contactEmail,
          phone: partner.phone,
          address: partner.address,
        }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Les activités du {partner.name}
          </h2>
        </div>
        <Link href="/partner/courses/new" className="btn-primary">
          + Nouvelle activité
        </Link>
      </div>

      {courses.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          Aucune activité pour l&apos;instant. Créez votre première activité.
        </div>
      )}

      <div className="space-y-8">
        {groups.map((g) => (
          <div key={g.label} className="space-y-3">
            <h3 className="text-lg font-bold text-slate-700">
              {g.label}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({g.items.length} édition{g.items.length > 1 ? "s" : ""})
              </span>
            </h3>
            {g.items.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-800">
                    {c.title}
                  </h2>
                  <span className={`badge-pill ${statusClasses(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {c.programme && (
                    <span className="font-medium text-slate-600">
                      Programme : {c.programme.name} ·{" "}
                    </span>
                  )}
                  {courseTypeLabel(c.type, c.recurring)} · {c.sessions.length}{" "}
                  séance{c.sessions.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/partner/courses/${c.id}`} className="btn-secondary">
                  Ouvrir
                </Link>
              </div>
            </div>

            {c.description && (
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="badge-pill bg-slate-100 text-slate-600">
                {populationLabel(c.population)} (défini par l&apos;administrateur)
              </span>
              <span
                className={`badge-pill ${
                  c.visibleInCatalogue
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {c.visibleInCatalogue ? "Visible dans le catalogue" : "Masqué"}
              </span>
              <TaxonomyPills course={c} />
              {c.badges.map((b) => (
                <span key={b.id} className="badge-pill bg-amber-100 text-amber-700">
                  {b.name}
                </span>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Date</th>
                    <th className="th">Heure</th>
                    <th className="th">Lieu</th>
                    <th className="th">Places</th>
                    <th className="th">Intervenant/Formateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="td">{s.sequence}</td>
                      <td className="td whitespace-nowrap">{formatDate(s.date)}</td>
                      <td className="td whitespace-nowrap">
                        {s.startTime}–{s.endTime}
                      </td>
                      <td className="td">
                        {s.isOnline ? (
                          <span className="text-blue-600">En ligne</span>
                        ) : (
                          s.location
                        )}
                      </td>
                      <td className="td">{s.placesAvailable}</td>
                      <td className="td">
                        {s.trainer
                          ? `${s.trainer.firstName} ${s.trainer.lastName}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
