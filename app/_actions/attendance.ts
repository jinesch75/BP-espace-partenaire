"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Set (or clear) a participant's presence for one séance, then recompute the
// overall enrolment status: completed (présent to all séances) → PRESENT.
export async function setAttendance(formData: FormData) {
  const session = getSession();
  if (!session) return;
  const traineeId = Number(formData.get("traineeId"));
  const sessionId = Number(formData.get("sessionId"));
  const raw = String(formData.get("status") ?? "");
  const status = raw === "PRESENT" || raw === "ABSENT" ? raw : null;
  if (!traineeId || !sessionId) return;

  const sess = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      course: { include: { sessions: { select: { id: true, trainerId: true } } } },
    },
  });
  if (!sess) return;
  const course = sess.course;

  let allowed = false;
  if (session.role === "MANAGER") allowed = true;
  else if (session.role === "PARTNER" && course.partnerId === session.partnerId)
    allowed = true;
  else if (
    session.role === "TRAINER" &&
    course.sessions.some((s) => s.trainerId === session.trainerId)
  )
    allowed = true;
  if (!allowed) return;

  if (status === null) {
    await prisma.attendance.deleteMany({ where: { traineeId, sessionId } });
  } else {
    await prisma.attendance.upsert({
      where: { traineeId_sessionId: { traineeId, sessionId } },
      update: { status },
      create: { traineeId, sessionId, status },
    });
  }

  // recompute the enrolment-level presence
  const ids = course.sessions.map((s) => s.id);
  const atts = await prisma.attendance.findMany({
    where: { traineeId, sessionId: { in: ids } },
  });
  let presence: "PRESENT" | "ABSENT" | null = null;
  if (ids.length > 0 && atts.length === ids.length && atts.every((a) => a.status === "PRESENT"))
    presence = "PRESENT";
  else if (atts.some((a) => a.status === "ABSENT")) presence = "ABSENT";
  await prisma.traineeAssignment.updateMany({
    where: { traineeId, courseId: course.id },
    data: { presence },
  });

  revalidatePath(`/partner/courses/${course.id}`);
  revalidatePath(`/trainer/courses/${course.id}`);
  revalidatePath(`/manager/courses/${course.id}`);
  revalidatePath("/manager/trainees");
}
