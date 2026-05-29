import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export type Conflict = {
  trainer: string;
  date: string;
  time: string;
  otherCourse: string;
};

function overlaps(aS: string, aE: string, bS: string, bE: string): boolean {
  return aS < bE && bS < aE;
}

/** Find sessions where this course's trainer is also booked in another
 *  course at an overlapping time on the same day. */
export async function getTrainerConflicts(courseId: number): Promise<Conflict[]> {
  const sessions = await prisma.session.findMany({
    where: { courseId, trainerId: { not: null } },
    include: { trainer: true },
  });

  const conflicts: Conflict[] = [];
  const seen = new Set<string>();

  for (const s of sessions) {
    const others = await prisma.session.findMany({
      where: {
        trainerId: s.trainerId,
        courseId: { not: courseId },
        date: s.date,
      },
      include: { course: true },
    });
    for (const o of others) {
      if (overlaps(s.startTime, s.endTime, o.startTime, o.endTime)) {
        const key = `${s.trainerId}-${s.id}-${o.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({
          trainer: s.trainer
            ? `${s.trainer.firstName} ${s.trainer.lastName}`
            : "Trainer",
          date: formatDate(s.date),
          time: `${s.startTime}–${s.endTime}`,
          otherCourse: o.course.title,
        });
      }
    }
  }
  return conflicts;
}
