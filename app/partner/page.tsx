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
import { updatePartnerInfo } from "@/app/partner/_actions";
import { SaveButton } from "@/app/_components/SaveButton";
import { TaxonomyPills, taxonomyInclude } from "@/app/_components/TaxonomyPills";

export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const partner = await requirePartner();
  const courses = await prisma.course.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { sequence: "asc" }, include: { trainer: true } },
      ...taxonomyInclude,
      badges: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Informations générales du partenaire — modifiables par le partenaire */}
      <form action={updatePartnerInfo} className="card space-y-4 p-5">
        <div>
          <label className="label">Nom</label>
          <input name="name" className="input" defaultValue={partner.name} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            name="description"
            rows={2}
            className="input"
            defaultValue={partner.description ?? ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">E-mail</label>
            <input
              name="contactEmail"
              type="email"
              className="input"
              defaultValue={partner.contactEmail ?? ""}
            />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input name="phone" className="input" defaultValue={partner.phone ?? ""} />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input name="address" className="input" defaultValue={partner.address ?? ""} />
          </div>
        </div>
        <SaveButton>Enregistrer mes informations</SaveButton>
      </form>

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

      <div className="space-y-4">
        {courses.map((c) => (
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
                  {courseTypeLabel(c.type, c.recurring)} · {c.sessions.length}{" "}
                  session{c.sessions.length > 1 ? "s" : ""}
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
    </div>
  );
}
