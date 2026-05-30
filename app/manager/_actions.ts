"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { hashPassword } from "@/lib/crypto";

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
  const topicIds = formData.getAll("topicIds").map((v) => Number(v));
  const badgeIds = formData.getAll("badgeIds").map((v) => Number(v));

  await prisma.course.update({
    where: { id: courseId },
    data: {
      population: population as any,
      visibleInCatalogue: visible,
      topics: { set: topicIds.map((id) => ({ id })) },
      badges: { set: badgeIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/manager/courses");
}
