"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Set (or clear) the presence of a participant in a course.
// Allowed for the manager, the owning partner, or a trainer assigned to the course.
export async function setPresence(formData: FormData) {
  const session = getSession();
  if (!session) return;

  const assignmentId = Number(formData.get("assignmentId"));
  const raw = String(formData.get("presence") ?? "");
  const presence = raw === "PRESENT" || raw === "ABSENT" ? raw : null;

  const a = await prisma.traineeAssignment.findUnique({
    where: { id: assignmentId },
    include: { course: { include: { sessions: { select: { trainerId: true } } } } },
  });
  if (!a) return;

  let allowed = false;
  if (session.role === "MANAGER") allowed = true;
  else if (session.role === "PARTNER" && a.course.partnerId === session.partnerId)
    allowed = true;
  else if (
    session.role === "TRAINER" &&
    a.course.sessions.some((s) => s.trainerId === session.trainerId)
  )
    allowed = true;
  if (!allowed) return;

  await prisma.traineeAssignment.update({
    where: { id: assignmentId },
    data: { presence: presence as any },
  });

  revalidatePath(`/partner/courses/${a.courseId}`);
  revalidatePath(`/trainer/courses/${a.courseId}`);
  revalidatePath(`/manager/courses/${a.courseId}`);
}
