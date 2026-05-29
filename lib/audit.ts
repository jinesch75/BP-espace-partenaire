import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function logAuditExplicit(
  actorRole: string,
  actorLabel: string,
  action: string,
  entity: string,
  entityId?: number | null,
  detail?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorRole,
        actorLabel,
        action,
        entity,
        entityId: entityId ?? null,
        detail: detail ?? null,
      },
    });
  } catch {
    // never let audit logging break the main action
  }
}

export async function logAudit(
  action: string,
  entity: string,
  entityId?: number | null,
  detail?: string | null
) {
  const s = getSession();
  let label = "unknown";
  if (s?.role === "MANAGER") label = "Manager";
  else if (s?.role === "PARTNER") label = `Partner #${s.partnerId}`;
  else if (s?.role === "TRAINER") label = `Trainer #${s.trainerId}`;
  await logAuditExplicit(s?.role ?? "ANON", label, action, entity, entityId, detail);
}
