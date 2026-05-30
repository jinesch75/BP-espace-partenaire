"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { hashPassword } from "@/lib/crypto";
import { dpiKeyOf } from "@/lib/dpi";

// Affect a participant to a specific activity (one per DPI column).
export async function assignDpiCourse(formData: FormData) {
  requireManager();
  const traineeId = Number(formData.get("traineeId"));
  const courseId = Number(formData.get("courseId"));
  if (!traineeId || !courseId) return;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { sessions: { orderBy: { sequence: "asc" }, take: 1 } },
  });
  if (!course) return;

  const key = dpiKeyOf(course.title);
  if (key) {
    // keep only one assignment per DPI column: drop other activities of this column
    const all = await prisma.course.findMany({ select: { id: true, title: true } });
    const ids = all.filter((c) => dpiKeyOf(c.title) === key).map((c) => c.id);
    await prisma.traineeAssignment.deleteMany({
      where: { traineeId, courseId: { in: ids } },
    });
  }

  const assignedDate = course.sessions[0]?.date ?? new Date();
  await prisma.traineeAssignment.create({
    data: { traineeId, courseId, assignedDate },
  });

  revalidatePath("/manager/trainees");
  revalidatePath(`/manager/trainees/${traineeId}`);
}

// Click-to-toggle the status of a DPI cell.
// With a future-dated affectation: date → présent (✓) → absent (✗) → date.
// Otherwise: ✓ ↔ ✗ (manual "a participé / n'a pas participé").
export async function cycleDpiStatus(formData: FormData) {
  requireManager();
  const traineeId = Number(formData.get("traineeId"));
  const key = String(formData.get("key") ?? "");
  if (!traineeId || !key) return;

  const assignments = await prisma.traineeAssignment.findMany({
    where: { traineeId },
    include: { course: { select: { title: true } } },
  });
  const a = assignments.find((x) => dpiKeyOf(x.course.title) === key);
  const now = Date.now();

  if (!a) {
    // no affectation yet → create one (présent / green check) on the first matching activity
    const courses = await prisma.course.findMany({
      include: { sessions: { orderBy: { sequence: "asc" }, take: 1 } },
    });
    const target = courses.find((c) => dpiKeyOf(c.title) === key);
    if (!target) return; // no activity of this step exists to affect
    await prisma.traineeAssignment.create({
      data: {
        traineeId,
        courseId: target.id,
        assignedDate: target.sessions[0]?.date ?? new Date(),
        presence: "PRESENT",
      },
    });
  } else {
    const future = new Date(a.assignedDate).getTime() > now;
    let next: "PRESENT" | "ABSENT" | null;
    if (a.presence === null) next = future ? "PRESENT" : "ABSENT";
    else if (a.presence === "PRESENT") next = "ABSENT";
    else next = null; // ABSENT → date (future) or check (past)
    await prisma.traineeAssignment.update({
      where: { id: a.id },
      data: { presence: next },
    });
  }

  revalidatePath("/manager/trainees");
  revalidatePath(`/manager/trainees/${traineeId}`);
}

export async function removeDpiAssignment(formData: FormData) {
  requireManager();
  const id = Number(formData.get("assignmentId"));
  if (!id) return;
  const a = await prisma.traineeAssignment.findUnique({
    where: { id },
    select: { traineeId: true },
  });
  if (!a) return;
  await prisma.traineeAssignment.delete({ where: { id } });
  revalidatePath("/manager/trainees");
  revalidatePath(`/manager/trainees/${a.traineeId}`);
}

export async function createPartner(formData: FormData) {
  requireManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/manager/partners/new?error=name");

  const loginEmail = String(formData.get("loginEmail") ?? "").trim().toLowerCase() || null;
  if (loginEmail) {
    const existing = await prisma.partner.findFirst({ where: { email: loginEmail } });
    if (existing) redirect("/manager/partners/new?error=email");
  }
  const password = String(formData.get("password") ?? "");

  await prisma.partner.create({
    data: {
      name,
      managesTrainees: formData.get("managesTrainees") === "on",
      description: String(formData.get("description") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      email: loginEmail,
      passwordHash: password ? hashPassword(password) : null,
    },
  });

  revalidatePath("/manager/partners");
  redirect("/manager/partners");
}

export async function updatePartner(formData: FormData) {
  requireManager();
  const id = Number(formData.get("partnerId"));
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  await prisma.partner.update({
    where: { id },
    data: {
      name: name || undefined,
      managesTrainees: formData.get("managesTrainees") === "on",
      description: String(formData.get("description") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    },
  });
  revalidatePath("/manager/partners");
  revalidatePath("/partner");
}

async function resolveTrainer(
  partnerId: number,
  formData: FormData,
  prefix: string
): Promise<number | null> {
  const raw = String(formData.get(`${prefix}trainerId`) ?? "");
  if (raw === "new") {
    const first = String(formData.get(`${prefix}newFirst`) ?? "").trim();
    const last = String(formData.get(`${prefix}newLast`) ?? "").trim();
    if (!first && !last) return null;
    const existing = await prisma.trainer.findFirst({
      where: { partnerId, firstName: first, lastName: last },
    });
    if (existing) return existing.id;
    const created = await prisma.trainer.create({
      data: { partnerId, firstName: first, lastName: last },
    });
    return created.id;
  }
  const id = Number(raw);
  if (!id) return null;
  const t = await prisma.trainer.findFirst({ where: { id, partnerId } });
  return t ? t.id : null;
}

// Manager can edit the details (title, description, sessions) of ANY course.
export async function updateCourseDetails(formData: FormData) {
  requireManager();
  const courseId = Number(formData.get("courseId"));
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { sessions: { select: { id: true } } },
  });
  if (!course) redirect("/manager/courses");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) redirect(`/manager/courses/${courseId}?error=title`);

  await prisma.course.update({
    where: { id: courseId },
    data: { title, description },
  });

  const count = Number(formData.get("sessionCount") ?? 0);
  const keptIds: number[] = [];

  for (let i = 0; i < count; i++) {
    const prefix = `s_${i}_`;
    if (!formData.get(`${prefix}date`)) continue;
    const isOnline = formData.get(`${prefix}isOnline`) === "on";
    const trainerId = await resolveTrainer(course.partnerId, formData, prefix);
    const data = {
      sequence: keptIds.length + 1,
      date: new Date(String(formData.get(`${prefix}date`))),
      startTime: String(formData.get(`${prefix}startTime`) ?? ""),
      endTime: String(formData.get(`${prefix}endTime`) ?? ""),
      isOnline,
      location: isOnline ? null : String(formData.get(`${prefix}location`) ?? "") || null,
      teamsLink: isOnline ? String(formData.get(`${prefix}teamsLink`) ?? "") || null : null,
      placesAvailable: Number(formData.get(`${prefix}places`) ?? 0) || 0,
      trainerId,
    };
    const existingId = Number(formData.get(`${prefix}id`) ?? 0);
    if (existingId && course.sessions.some((s) => s.id === existingId)) {
      await prisma.session.update({ where: { id: existingId }, data });
      keptIds.push(existingId);
    } else {
      const created = await prisma.session.create({ data: { ...data, courseId } });
      keptIds.push(created.id);
    }
  }

  await prisma.session.deleteMany({
    where: { courseId, id: { notIn: keptIds.length ? keptIds : [-1] } },
  });

  revalidatePath("/manager/courses");
  revalidatePath(`/manager/courses/${courseId}`);
  redirect(`/manager/courses/${courseId}`);
}

export async function deleteCourseAsManager(formData: FormData) {
  requireManager();
  const courseId = Number(formData.get("courseId"));
  if (!courseId) return;
  // deletes the course and (by cascade) its sessions and assignments
  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/manager/courses");
  redirect("/manager/courses");
}

export async function updateTrainerAsManager(formData: FormData) {
  requireManager();
  const id = Number(formData.get("trainerId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!id || (!firstName && !lastName)) return;
  await prisma.trainer.update({
    where: { id },
    data: { firstName, lastName },
  });
  revalidatePath("/manager/trainers");
}

export async function deleteTrainerAsManager(formData: FormData) {
  requireManager();
  const id = Number(formData.get("trainerId"));
  if (!id) return;
  await prisma.trainer.delete({ where: { id } });
  revalidatePath("/manager/trainers");
}

export async function deletePartner(formData: FormData) {
  requireManager();
  const id = Number(formData.get("partnerId"));
  if (!id) return;
  // deletes the partner and (by cascade) their courses, sessions and trainers
  await prisma.partner.delete({ where: { id } });
  revalidatePath("/manager/partners");
  redirect("/manager/partners");
}

export async function updateCourseAdmin(formData: FormData) {
  requireManager();
  const courseId = Number(formData.get("courseId"));
  if (!courseId) return;

  const populationRaw = String(formData.get("population") ?? "");
  const population =
    populationRaw === "POP1" || populationRaw === "POP2" ? populationRaw : null;
  const visible = formData.get("visibleInCatalogue") === "on";
  const badgeIds = formData.getAll("badgeIds").map((v) => Number(v));
  const statusRaw = String(formData.get("status") ?? "");
  const status = ["DRAFT", "OPEN", "COMPLETED", "CANCELLED"].includes(statusRaw)
    ? statusRaw
    : undefined;
  const num = (k: string) => Number(formData.get(k)) || null;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      population: population as any,
      visibleInCatalogue: visible,
      status: status as any,
      topicPrimaryId: num("topicPrimaryId"),
      topicSecondaryId: num("topicSecondaryId"),
      topicTertiaryId: num("topicTertiaryId"),
      categoryPrimaryId: num("categoryPrimaryId"),
      categorySecondaryId: num("categorySecondaryId"),
      categoryTertiaryId: num("categoryTertiaryId"),
      badges: { set: badgeIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/manager/courses");
  revalidatePath(`/manager/courses/${courseId}`);
}
