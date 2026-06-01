"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { hashPassword } from "@/lib/crypto";
import { dpiKeyOf, courseDpiKey } from "@/lib/dpi";

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

  const key = courseDpiKey(course);
  if (key) {
    // keep only one assignment per DPI column: drop other activities of this column
    const all = await prisma.course.findMany({
      select: { id: true, title: true, dpiStep: true },
    });
    const ids = all.filter((c) => courseDpiKey(c) === key).map((c) => c.id);
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
    include: { course: { select: { title: true, dpiStep: true } } },
  });
  const a = assignments.find((x) => courseDpiKey(x.course) === key);
  const now = Date.now();

  if (!a) {
    const courses = await prisma.course.findMany({
      include: { sessions: { orderBy: { sequence: "asc" }, take: 1 } },
    });
    const target = courses.find((c) => courseDpiKey(c) === key);
    if (target) {
      // an activity exists for this step → affect it (présent / green check)
      await prisma.traineeAssignment.create({
        data: {
          traineeId,
          courseId: target.id,
          assignedDate: target.sessions[0]?.date ?? new Date(),
          presence: "PRESENT",
        },
      });
    } else {
      // no activity of this step exists → manual mark, toggle ✓ / ✗
      const existing = await prisma.traineeDpiStatus.findUnique({
        where: { traineeId_dpiKey: { traineeId, dpiKey: key } },
      });
      const next = existing?.status === "PRESENT" ? "ABSENT" : "PRESENT";
      await prisma.traineeDpiStatus.upsert({
        where: { traineeId_dpiKey: { traineeId, dpiKey: key } },
        update: { status: next },
        create: { traineeId, dpiKey: key, status: next },
      });
    }
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

// Quick explicit mark for a DPI cell: PRESENT / ABSENT / CLEAR.
export async function markDpi(formData: FormData) {
  requireManager();
  const traineeId = Number(formData.get("traineeId"));
  const key = String(formData.get("key") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!traineeId || !key) return;

  const assignments = await prisma.traineeAssignment.findMany({
    where: { traineeId },
    include: { course: { select: { title: true, dpiStep: true } } },
  });
  const a = assignments.find((x) => courseDpiKey(x.course) === key);

  if (status === "CLEAR") {
    if (a) await prisma.traineeAssignment.delete({ where: { id: a.id } });
    await prisma.traineeDpiStatus.deleteMany({ where: { traineeId, dpiKey: key } });
  } else if (status === "PRESENT" || status === "ABSENT") {
    if (a) {
      await prisma.traineeAssignment.update({
        where: { id: a.id },
        data: { presence: status },
      });
    } else {
      await prisma.traineeDpiStatus.upsert({
        where: { traineeId_dpiKey: { traineeId, dpiKey: key } },
        update: { status },
        create: { traineeId, dpiKey: key, status },
      });
    }
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

  // title/description are inherited from the programme — not edited here.
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
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!id || (!firstName && !lastName)) return;
  await prisma.trainer.update({
    where: { id },
    data: { firstName, lastName, email, phone },
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

// Copy a programme's shared info onto all its éditions (courses).
export async function propagateProgramme(programmeId: number) {
  const p = await prisma.programme.findUnique({ where: { id: programmeId } });
  if (!p) return;
  const courses = await prisma.course.findMany({
    where: { programmeId },
    select: { id: true },
  });
  for (const c of courses) {
    await prisma.course.update({
      where: { id: c.id },
      data: {
        title: p.name,
        description: p.description,
        population: p.population,
        visibleInCatalogue: p.visibleInCatalogue,
        dpiStep: p.dpiStep,
        topicPrimaryId: p.topicPrimaryId,
        topicSecondaryId: p.topicSecondaryId,
        topicTertiaryId: p.topicTertiaryId,
        categoryPrimaryId: p.categoryPrimaryId,
        categorySecondaryId: p.categorySecondaryId,
        categoryTertiaryId: p.categoryTertiaryId,
        badges: { set: p.badgeIds.map((id) => ({ id })) },
      },
    });
  }
}

const DPI_STEPS = ["DAPA1", "DAPA2", "DAPA3", "DAPA4", "DAPA5", "BIENV"];

export async function updateProgramme(formData: FormData) {
  requireManager();
  const id = Number(formData.get("programmeId"));
  if (!id) return;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const populationRaw = String(formData.get("population") ?? "");
  const population =
    populationRaw === "POP1" || populationRaw === "POP2" ? populationRaw : null;
  const visible = formData.get("visibleInCatalogue") === "on";
  const dpiRaw = String(formData.get("dpiStep") ?? "");
  const dpiStep = DPI_STEPS.includes(dpiRaw) ? dpiRaw : null;
  const num = (k: string) => Number(formData.get(k)) || null;
  const badgeIds = formData.getAll("badgeIds").map((v) => Number(v));

  await prisma.programme.update({
    where: { id },
    data: {
      name: name || undefined,
      description,
      population: population as any,
      visibleInCatalogue: visible,
      dpiStep,
      topicPrimaryId: num("topicPrimaryId"),
      topicSecondaryId: num("topicSecondaryId"),
      topicTertiaryId: num("topicTertiaryId"),
      categoryPrimaryId: num("categoryPrimaryId"),
      categorySecondaryId: num("categorySecondaryId"),
      categoryTertiaryId: num("categoryTertiaryId"),
      badgeIds,
    },
  });
  await propagateProgramme(id);
  revalidatePath("/manager/programmes");
  revalidatePath("/manager/courses");
  revalidatePath("/manager/trainees");
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
