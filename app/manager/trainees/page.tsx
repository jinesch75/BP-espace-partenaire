import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";
import { DPI_COLUMNS as COLUMNS, courseDpiKey } from "@/lib/dpi";
import { DpiCell } from "@/app/_components/DpiCell";

export const dynamic = "force-dynamic";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#16a34a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 10.5l3.5 3.5L15.5 6" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#dc2626" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" />
    </svg>
  );
}
function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// Small sortable header link that toggles direction.
function SortHeader({
  label,
  sortKey,
  current,
  dir,
  className,
}: {
  label: string;
  sortKey: string;
  current: string;
  dir: string;
  className?: string;
}) {
  const active = current === sortKey;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  const arrow = active ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <Link
      href={`/manager/trainees?sort=${sortKey}&dir=${nextDir}`}
      className={`hover:text-brand ${active ? "text-brand" : ""} ${className ?? ""}`}
    >
      {label}
      {arrow}
    </Link>
  );
}

export default async function ManagerTrainees({
  searchParams,
}: {
  searchParams: { sort?: string; dir?: string; q?: string };
}) {
  requireManager();

  const trainees = await prisma.trainee.findMany({
    include: {
      assignments: {
        include: { course: { select: { title: true, dpiStep: true } } },
        orderBy: { assignedDate: "asc" },
      },
      dpiStatuses: true,
    },
  });

  const now = Date.now();

  // available future activities per DPI step (for the click-to-affect dropdown)
  const allCourses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      dpiStep: true,
      sessions: { orderBy: { sequence: "asc" }, take: 1, select: { date: true } },
    },
  });
  const optionsByKey: Record<string, { id: number; label: string }[]> = {};
  for (const col of COLUMNS) optionsByKey[col.key] = [];
  for (const c of allCourses) {
    const key = courseDpiKey(c);
    if (!key || !optionsByKey[key]) continue;
    const d = c.sessions[0]?.date;
    if (!d || new Date(d).getTime() < now) continue; // future only
    optionsByKey[key].push({ id: c.id, label: `${c.title} — ${formatDate(d)}` });
  }

  // rank for a column: 2 = a participé, 1 = programmé, 0 = rien
  function colRank(t: (typeof trainees)[number], key: string): number {
    const a = t.assignments.find((x) => courseDpiKey(x.course) === key);
    const s = t.dpiStatuses.find((x) => x.dpiKey === key);
    if (a) {
      if (a.presence === "ABSENT") return 0;
      if (a.presence === "PRESENT" || new Date(a.assignedDate).getTime() <= now)
        return 2;
      return 1; // future, scheduled
    }
    if (s) return s.status === "PRESENT" ? 2 : 0;
    return 0;
  }

  const days = (t: (typeof trainees)[number]) =>
    t.inscriptionOna
      ? Math.floor((now - new Date(t.inscriptionOna).getTime()) / 86400000)
      : -1;

  // search (surname / first name / national number)
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const filtered = q
    ? trainees.filter((t) => {
        const nn = decryptSensitive(t.nationalNumber).toLowerCase();
        return (
          t.lastName.toLowerCase().includes(q) ||
          t.firstName.toLowerCase().includes(q) ||
          nn.includes(q)
        );
      })
    : trainees;

  // sorting
  const sort = searchParams.sort ?? "days";
  const dir = searchParams.dir ?? "desc";
  const mul = dir === "asc" ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sort === "name") cmp = a.lastName.localeCompare(b.lastName);
    else if (sort === "days") cmp = days(a) - days(b);
    else if (sort === "member") cmp = (a.biergerpaktMember ? 1 : 0) - (b.biergerpaktMember ? 1 : 0);
    else if (sort.startsWith("col_")) cmp = colRank(a, sort.slice(4)) - colRank(b, sort.slice(4));
    if (cmp === 0) cmp = a.lastName.localeCompare(b.lastName) * (dir === "asc" ? 1 : -1);
    return cmp * mul;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">
          Demandeurs de protection internationale (DPI)
        </h1>
        <p className="text-sm text-slate-500">
          {trainees.length} participants. Le numéro national est sensible et
          chiffré. Suivi de participation aux six activités du parcours.
          Cliquez sur une case pour changer son statut, ou sur un en-tête pour
          trier.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><CheckIcon /> A participé</span>
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-amber-600">jj/mm/aa</span> Programmé (date prévue)
        </span>
        <span className="inline-flex items-center gap-1"><CrossIcon /> N&apos;a pas participé</span>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div className="min-w-[280px] flex-1">
          <label className="label">Rechercher</label>
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Nom, prénom ou numéro national"
            className="input"
          />
        </div>
        <button className="btn-primary">Rechercher</button>
        {q && (
          <a href="/manager/trainees" className="btn-secondary">
            Effacer
          </a>
        )}
        <span className="ml-auto text-sm text-slate-500">
          {sorted.length} résultat{sorted.length === 1 ? "" : "s"}
        </span>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="th">
                <SortHeader label="Nom de famille" sortKey="name" current={sort} dir={dir} />
              </th>
              <th className="th">Prénom</th>
              <th className="th">Numéro national</th>
              <th className="th whitespace-nowrap">Inscription ONA</th>
              <th className="th w-16 text-center align-bottom">
                <SortHeader
                  label="Jours depuis inscription ONA"
                  sortKey="days"
                  current={sort}
                  dir={dir}
                  className="inline-block whitespace-normal leading-tight"
                />
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="th text-center">
                  <SortHeader
                    label={c.label}
                    sortKey={`col_${c.key}`}
                    current={sort}
                    dir={dir}
                  />
                </th>
              ))}
              <th className="th text-center whitespace-nowrap">
                <SortHeader
                  label="Adhérent Biergerpakt"
                  sortKey="member"
                  current={sort}
                  dir={dir}
                  className="inline-block w-20 whitespace-normal leading-tight"
                />
              </th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.lastName}</td>
                <td className="td">{t.firstName}</td>
                <td className="td whitespace-nowrap">
                  {decryptSensitive(t.nationalNumber)}
                </td>
                <td className="td whitespace-nowrap">
                  {t.inscriptionOna ? formatDate(t.inscriptionOna) : "—"}
                </td>
                <td className="td text-center">
                  {days(t) >= 0 ? days(t) : "—"}
                </td>
                {COLUMNS.map((c) => {
                  const a = t.assignments.find(
                    (x) => courseDpiKey(x.course) === c.key
                  );
                  const s = t.dpiStatuses.find((x) => x.dpiKey === c.key);
                  const check = (
                    <span title="A participé">
                      <CheckIcon />
                    </span>
                  );
                  const cross = (
                    <span title="N'a pas participé">
                      <CrossIcon />
                    </span>
                  );
                  let cell: React.ReactNode;
                  if (a) {
                    if (a.presence === "ABSENT") cell = cross;
                    else if (
                      a.presence === "PRESENT" ||
                      new Date(a.assignedDate).getTime() <= now
                    ) {
                      cell = (
                        <span title={`A participé — ${formatDate(a.assignedDate)}`}>
                          <CheckIcon />
                        </span>
                      );
                    } else {
                      cell = (
                        <span
                          className="whitespace-nowrap text-xs font-semibold text-amber-600"
                          title={`Programmé le ${formatDate(a.assignedDate)}`}
                        >
                          {shortDate(a.assignedDate)}
                        </span>
                      );
                    }
                  } else if (s) {
                    cell = s.status === "PRESENT" ? check : cross;
                  } else {
                    cell = cross;
                  }
                  return (
                    <td key={c.key} className="td text-center">
                      <DpiCell
                        traineeId={t.id}
                        colKey={c.key}
                        options={optionsByKey[c.key] ?? []}
                        currentCourseId={a?.courseId ?? null}
                      >
                        {cell}
                      </DpiCell>
                    </td>
                  );
                })}
                <td className="td text-center">
                  {t.biergerpaktMember ? (
                    <span className="badge-pill bg-green-100 text-green-700">Oui</span>
                  ) : (
                    <span className="badge-pill bg-slate-100 text-slate-500">Non</span>
                  )}
                </td>
                <td className="td text-right">
                  <Link
                    href={`/manager/trainees/${t.id}`}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Gérer
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
