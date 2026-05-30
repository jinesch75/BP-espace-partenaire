import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { decryptSensitive } from "@/lib/crypto";
import { DPI_COLUMNS, dpiKeyOf } from "@/lib/dpi";
import { PresenceControls } from "@/app/_components/PresenceControls";
import { assignDpiCourse, removeDpiAssignment } from "@/app/manager/_actions";

export const dynamic = "force-dynamic";

export default async function TraineeDetail({
  params,
}: {
  params: { id: string };
}) {
  requireManager();
  const trainee = await prisma.trainee.findUnique({
    where: { id: Number(params.id) },
    include: {
      assignments: { include: { course: true } },
    },
  });
  if (!trainee) notFound();

  // all activities, with their first session date, to populate the selects
  const courses = await prisma.course.findMany({
    include: {
      partner: true,
      sessions: { orderBy: { sequence: "asc" }, take: 1 },
    },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/manager/trainees" className="text-sm text-brand hover:underline">
          ← Retour aux participants
        </Link>
        <h1 className="section-title mt-2">
          {trainee.lastName} {trainee.firstName}
        </h1>
        <p className="text-sm text-slate-500">
          Numéro national : {decryptSensitive(trainee.nationalNumber)}
        </p>
      </div>

      <p className="text-sm text-slate-500">
        Pour chaque étape du parcours, choisissez l&apos;activité à affecter. La
        date de l&apos;activité s&apos;affichera comme statut dans le tableau
        principal.
      </p>

      <div className="space-y-4">
        {DPI_COLUMNS.map((col) => {
          const options = courses.filter((c) => dpiKeyOf(c.title) === col.key);
          const current = trainee.assignments.find(
            (a) => dpiKeyOf(a.course.title) === col.key
          );
          return (
            <div key={col.key} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-800">{col.label}</h2>
                {current ? (
                  <span className="badge-pill bg-green-100 text-green-700">
                    Affecté : {current.course.title} · {formatDate(current.assignedDate)}
                  </span>
                ) : (
                  <span className="badge-pill bg-slate-100 text-slate-500">
                    Non affecté
                  </span>
                )}
              </div>

              {current && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-500">Présence :</span>
                  <PresenceControls
                    assignmentId={current.id}
                    presence={current.presence}
                  />
                  <form action={removeDpiAssignment}>
                    <input type="hidden" name="assignmentId" value={current.id} />
                    <button className="text-xs text-red-600 hover:underline">
                      Retirer cette affectation
                    </button>
                  </form>
                </div>
              )}

              {options.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                  Aucune activité « {col.label} » disponible.
                </p>
              ) : (
                <form
                  action={assignDpiCourse}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="traineeId" value={trainee.id} />
                  <div className="min-w-[320px]">
                    <label className="label">
                      {current ? "Changer pour" : "Affecter"} une activité {col.label}
                    </label>
                    <select name="courseId" className="input" required>
                      <option value="">— choisir —</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                          {c.sessions[0]
                            ? ` — ${formatDate(c.sessions[0].date)}`
                            : ""}{" "}
                          ({c.partner.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary">Affecter</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
