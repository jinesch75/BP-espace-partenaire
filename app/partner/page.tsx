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
import { ActivityCalendar } from "@/app/_components/ActivityCalendar";

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
  const groupsMap = new Map<
    string,
    { label: string; programmeId: number | null; items: typeof courses }
  >();
  for (const c of courses) {
    const key = c.programme ? `p${c.programme.id}` : `t${c.title}`;
    const label = c.programme?.name ?? c.title;
    if (!groupsMap.has(key))
      groupsMap.set(key, { label, programmeId: c.programme?.id ?? null, items: [] });
    groupsMap.get(key)!.items.push(c);
  }
  const groups = [...groupsMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  for (const g of groups) g.items.sort((a, b) => firstDate(a) - firstDate(b));

  // --- Calendar data ---
  // A stable colour per programme. Fixed colours for the DPI steps, palette otherwise.
  const STEP_COLORS: Record<string, string> = {
    DAPA1: "#16a34a", // vert
    DAPA2: "#2563eb", // bleu
    DAPA3: "#d97706", // orange
    DAPA4: "#9333ea", // violet
    DAPA5: "#dc2626", // rouge
    BIENV: "#0d9488", // sarcelle
  };
  const PALETTE = [
    "#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626",
    "#0d9488", "#db2777", "#65a30d", "#0891b2", "#b45309",
  ];
  const progColor = new Map<number, string>();
  let pi = 0;
  function colorFor(c: (typeof courses)[number]): string {
    if (c.dpiStep && STEP_COLORS[c.dpiStep]) return STEP_COLORS[c.dpiStep];
    const pid = c.programme?.id ?? -c.id;
    if (!progColor.has(pid)) progColor.set(pid, PALETTE[pi++ % PALETTE.length]);
    return progColor.get(pid)!;
  }

  const ymd = (d: Date) =>
    new Date(d).getFullYear() +
    "-" +
    String(new Date(d).getMonth() + 1).padStart(2, "0") +
    "-" +
    String(new Date(d).getDate()).padStart(2, "0");

  const calendarEvents = courses.flatMap((c) => {
    const total = c.sessions.length;
    const color = colorFor(c);
    const allSessions = c.sessions.map((s) => ({ seq: s.sequence, date: ymd(s.date) }));
    return c.sessions.map((s) => ({
      date: ymd(s.date),
      courseId: c.id,
      title: c.title,
      color,
      seq: s.sequence,
      total,
      time: `${s.startTime}–${s.endTime}`,
      where: s.isOnline ? "En ligne" : s.location ?? "",
      sessions: allSessions,
    }));
  });

  // legend: one entry per distinct colour/label
  const legendMap = new Map<string, { label: string; color: string }>();
  for (const c of courses) {
    const label = c.programme?.name ?? c.title;
    if (!legendMap.has(label)) legendMap.set(label, { label, color: colorFor(c) });
  }
  const legend = [...legendMap.values()];

  // all the partner's programmes (incl. those without any édition yet)
  const programmes = await prisma.programme.findMany({
    where: { partnerId: partner.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });

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

      <ActivityCalendar events={calendarEvents} legend={legend} />

      {/* Résumé des programmes proposés, avec création rapide d'une édition */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">
          Activités proposées par {partner.name}
        </h2>
        {programmes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {programmes.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="text-sm">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {p._count.courses} édition{p._count.courses > 1 ? "s" : ""}
                  </span>
                </span>
                <Link
                  href={`/partner/courses/new?programmeId=${p.id}`}
                  className="btn-secondary"
                >
                  + Nouvelle édition
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            Aucune activité pour l&apos;instant.
          </p>
        )}
        <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
          <Link href="/partner/courses/new" className="btn-primary">
            + Nouvelle activité
          </Link>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800">
        Les activités du {partner.name}
      </h2>

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
                      Activité proposée par {partner.name} : {c.programme.name} ·{" "}
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
