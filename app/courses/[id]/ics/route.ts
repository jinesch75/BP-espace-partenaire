import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildICS } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const courseId = Number(params.id);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { sessions: { orderBy: { sequence: "asc" } } },
  });
  if (!course) return new Response("Not found", { status: 404 });

  // access check
  let allowed = false;
  if (session.role === "MANAGER") allowed = true;
  else if (session.role === "PARTNER" && course.partnerId === session.partnerId)
    allowed = true;
  else if (
    session.role === "TRAINER" &&
    course.sessions.some((s) => s.trainerId === session.trainerId)
  )
    allowed = true;
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const ics = buildICS(course.id, course.title, course.sessions);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="course-${course.id}.ics"`,
    },
  });
}
