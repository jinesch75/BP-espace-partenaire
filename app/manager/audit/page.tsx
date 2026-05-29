import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  requireManager();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Audit log</h1>
        <p className="text-sm text-slate-500">
          Most recent 200 events. Records logins and changes to courses,
          trainers and trainee assignments (GDPR accountability).
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <th className="th">When</th>
              <th className="th">Actor</th>
              <th className="th">Action</th>
              <th className="th">Entity</th>
              <th className="th">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="td whitespace-nowrap">
                  {l.createdAt.toLocaleString("fr-BE")}
                </td>
                <td className="td">
                  <span className="font-medium">{l.actorLabel}</span>
                  <span className="ml-1 text-xs text-slate-400">({l.actorRole})</span>
                </td>
                <td className="td">
                  <span className="badge-pill bg-brand-light text-brand">
                    {l.action}
                  </span>
                </td>
                <td className="td">
                  {l.entity}
                  {l.entityId ? ` #${l.entityId}` : ""}
                </td>
                <td className="td text-slate-500">{l.detail ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={5}>
                  No events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
