"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";

type SessionInput = {
  sequence: number;
  date: Date;
  startTime: string;
  endTime: string;
  isOnline: boolean;
  location: string | null;
  teamsLink: string | null;
  placesAvailable: number;
  trainerId: number | null;
};

/** Resolve a trainer for this partner from form fields with the given prefix.
 *  Supports picking an existing trainer or adding a new one inline ("new"). */
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
  // security: only allow this partner's own trainers
  const t = await prisma.trainer.findFirst({ where: { id, partnerId } });
  return t ? t.id : null;
}

function readSession(
  formData: FormData,
  prefix: string,
  sequence: number
): SessionInput {
  const isOnline = formData.get(`${prefix}isOnline`) === "on";
  return {
    sequence,
    date: new Date(String(formData.get(`${prefix}date`))),
    startTime: String(formData.get(`${prefix}startTime`) ?? ""),
    endTime: String(formData.get(`${prefix}endTime`) ?? ""),
    isOnline,
    location: isOnline ? null : String(formData.get(`${prefix}location`) ?? "") || null,
    teamsLink: isOnline ? String(formData.get(`${prefix}teamsLink`) ?? "") || null : null,
    placesAvailable: Number(formData.get(`${prefix}places`) ?? 0) || 0,
    trainerId: null, // filled by caller (async)
  };
}

export async function createCourse(formData: FormData) {
  const partner = await requirePartner();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "SINGLE");

  if (!title) redirect("/partner/courses/new?error=title");

  const sessions: SessionInput[] = [];

  if (type === "RECURRING") {
    const start = new Date(String(formData.get("rec_firstDate")));
    const startTime = String(formData.get("rec_startTime") ?? "");
    const endTime = String(formData.get("rec_endTime") ?? "");
    const isOnline = formData.get("rec_isOnline") === "on";
    const location = isOnline ? null : String(formData.get("rec_location") ?? "") || null;
    const teamsLink = isOnline ? String(formData.get("rec_teamsLink") ?? "") || null : null;
    const places = Number(formData.get("rec_places") ?? 0) || 0;
    const trainerId = await resolveTrainer(partner.id, formData, "rec_");
    const endMode = String(formData.get("rec_endMode") ?? "count");

    const dates: Date[] = [];
    if (endMode === "date") {
      const endDate = new Date(String(formData.get("rec_endDate")));
      let cur = new Date(start);
      let guard = 0;
      while (cur <= endDate && guard < 104) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 7);
        guard++;
      }
    } else {
      const count = Math.max(1, Math.min(52, Number(formData.get("rec_count") ?? 1)));
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + 7 * i);
        dates.push(d);
      }
    }

    dates.forEach((d, i) => {
      sessions.push({
        sequence: i + 1,
        date: d,
        startTime,
        endTime,
        isOnline,
        location,
        teamsLink,
        placesAvailable: places,
        trainerId,
      });
    });
  } else {
    const count = type === "SINGLE" ? 1 : Number(formData.get("sessionCount") ?? 1);
    for (let i = 0; i < count; i++) {
      const prefix = `s_${i}_`;
      // skip blank rows (no date)
      if (!formData.get(`${prefix}date`)) continue;
      const s = readSession(formData, prefix, sessions.length + 1);
      s.trainerId = await resolveTrainer(partner.id, formData, prefix);
      sessions.push(s);
    }
  }

  if (sessions.length === 0) redirect("/partner/courses/new?error=session");

  // Programme (regroupement). Pick an existing programme of this partner, or
  // create a new one. A new édition inherits the programme's shared info.
  let programmeId = Number(formData.get("programmeId")) || null;
  const newProgrammeName = String(formData.get("newProgrammeName") ?? "").trim();
  if (!programmeId) {
    const prog = await prisma.programme.create({
      data: { name: newProgrammeName || title, partnerId: partner.id },
    });
    programmeId = prog.id;
  } else {
    // ensure the chosen programme belongs to this partner
    const owned = await prisma.programme.findFirst({
      where: { id: programmeId, partnerId: partner.id },
    });
    if (!owned) programmeId = null;
  }

  const prog = programmeId
    ? await prisma.programme.findUnique({ where: { id: programmeId } })
    : null;

  const created = await prisma.course.create({
    data: {
      partnerId: partner.id,
      programmeId,
      title,
      description,
      type: type === "SINGLE" ? "SINGLE" : "MULTI",
      recurring: type === "RECURRING",
      status: "DRAFT",
      // inherit the programme's shared admin info
      dpiStep: prog?.dpiStep ?? null,
      population: prog?.population ?? null,
      visibleInCatalogue: prog?.visibleInCatalogue ?? false,
      topicPrimaryId: prog?.topicPrimaryId ?? null,
      topicSecondaryId: prog?.topicSecondaryId ?? null,
      topicTertiaryId: prog?.topicTertiaryId ?? null,
      categoryPrimaryId: prog?.categoryPrimaryId ?? null,
      categorySecondaryId: prog?.categorySecondaryId ?? null,
      categoryTertiaryId: prog?.categoryTertiaryId ?? null,
      badges: prog ? { connect: prog.badgeIds.map((id) => ({ id })) } : undefined,
      sessions: { create: sessions },
    },
  });

  revalidatePath("/partner");
  redirect("/partner");
}

export async function updateCourse(formData: FormData) {
  const partner = await requirePartner();
  const courseId = Number(formData.get("courseId"));
  const course = await prisma.course.findFirst({
    where: { id: courseId, partnerId: partner.id },
    include: { sessions: { select: { id: true } } },
  });
  if (!course) redirect("/partner");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) redirect(`/partner/courses/${courseId}/edit?error=title`);

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
    const trainerId = await resolveTrainer(partner.id, formData, prefix);
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
      const created = await prisma.session.create({
        data: { ...data, courseId },
      });
      keptIds.push(created.id);
    }
  }

  // remove sessions the user deleted
  await prisma.session.deleteMany({
    where: { courseId, id: { notIn: keptIds.length ? keptIds : [-1] } },
  });

  revalidatePath("/partner");
  revalidatePath(`/partner/courses/${courseId}`);
  redirect(`/partner/courses/${courseId}`);
}

export async function setCourseStatus(formData: FormData) {
  const partner = await requirePartner();
  const courseId = Number(formData.get("courseId"));
  const status = String(formData.get("status"));
  await prisma.course.updateMany({
    where: { id: courseId, partnerId: partner.id },
    data: { status: status as any },
  });
  revalidatePath("/partner");
  revalidatePath(`/partner/courses/${courseId}`);
}

export async function deleteCourse(formData: FormData) {
  const partner = await requirePartner();
  const courseId = Number(formData.get("courseId"));
  await prisma.course.deleteMany({
    where: { id: courseId, partnerId: partner.id },
  });
  revalidatePath("/partner");
  redirect("/partner");
}

export async function assignTrainee(formData: FormData) {
  const partner = await requirePartner();
  if (!partner.managesTrainees) redirect("/partner");
  const courseId = Number(formData.get("courseId"));
  const traineeId = Number(formData.get("traineeId"));
  if (!courseId || !traineeId) return;

  // course must belong to this partner
  const course = await prisma.course.findFirst({
    where: { id: courseId, partnerId: partner.id },
    include: { sessions: { orderBy: { sequence: "asc" }, take: 1 } },
  });
  if (!course) return;
  const assignedDate = course.sessions[0]?.date ?? new Date();

  await prisma.traineeAssignment.upsert({
    where: { traineeId_courseId: { traineeId, courseId } },
    update: { assignedDate },
    create: { traineeId, courseId, assignedDate },
  });
  revalidatePath("/partner/assign");
  revalidatePath(`/partner/courses/${courseId}`);
}

export async function removeAssignment(formData: FormData) {
  const partner = await requirePartner();
  if (!partner.managesTrainees) redirect("/partner");
  const id = Number(formData.get("assignmentId"));
  // ensure it belongs to one of this partner's courses
  const a = await prisma.traineeAssignment.findUnique({
    where: { id },
    include: { course: true },
  });
  if (a && a.course.partnerId === partner.id) {
    await prisma.traineeAssignment.delete({ where: { id } });
    revalidatePath(`/partner/courses/${a.courseId}`);
  }
  revalidatePath("/partner/assign");
}

export async function addTrainer(formData: FormData) {
  const partner = await requirePartner();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName && !lastName) return;
  await prisma.trainer.create({
    data: { partnerId: partner.id, firstName, lastName },
  });
  revalidatePath("/partner/trainers");
}

export async function updatePartnerInfo(formData: FormData) {
  const partner = await requirePartner();
  const name = String(formData.get("name") ?? "").trim();
  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      name: name || undefined,
      description: String(formData.get("description") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    },
  });
  revalidatePath("/partner");
}

export async function updateTrainer(formData: FormData) {
  const partner = await requirePartner();
  const id = Number(formData.get("trainerId"));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!id || (!firstName && !lastName)) return;
  await prisma.trainer.updateMany({
    where: { id, partnerId: partner.id },
    data: { firstName, lastName },
  });
  revalidatePath("/partner/trainers");
}

export async function deleteTrainer(formData: FormData) {
  const partner = await requirePartner();
  const id = Number(formData.get("trainerId"));
  if (!id) return;
  // sessions that referenced this trainer keep their slot but lose the trainer
  await prisma.trainer.deleteMany({ where: { id, partnerId: partner.id } });
  revalidatePath("/partner/trainers");
}
