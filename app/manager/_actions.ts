"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";

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
