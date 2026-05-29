"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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

  await logAudit(
    "ADMIN_UPDATE",
    "Course",
    courseId,
    `population=${population ?? "unset"}, visible=${visible}`
  );
  revalidatePath("/manager/courses");
}
