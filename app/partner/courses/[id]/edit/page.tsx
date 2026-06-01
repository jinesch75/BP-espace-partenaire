import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import EditCourseForm from "./EditCourseForm";
import { LanguageSelectors } from "@/app/_components/LanguageSelectors";
import { SaveButton } from "@/app/_components/SaveButton";
import { updateCourseLanguages } from "@/app/partner/_actions";

export const dynamic = "force-dynamic";

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const partner = await requirePartner();
  const course = await prisma.course.findFirst({
    where: { id: Number(params.id), partnerId: partner.id },
    include: {
      sessions: { orderBy: { sequence: "asc" } },
      programme: { select: { id: true, languages: true } },
    },
  });
  if (!course) notFound();

  const trainers = await prisma.trainer.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const sessions = course.sessions.map((s) => ({
    id: s.id,
    date: toDateInput(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    isOnline: s.isOnline,
    location: s.location,
    teamsLink: s.teamsLink,
    placesAvailable: s.placesAvailable,
    trainerId: s.trainerId,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/partner/courses/${course.id}`} className="text-sm font-medium text-brand hover:underline">
          ← Retour à l'activité
        </Link>
        <h1 className="section-title mt-2">Modifier l'activité</h1>
      </div>

      {searchParams.error === "title" && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez saisir un titre d'activité.
        </div>
      )}

      {course.programme && (
        <form action={updateCourseLanguages} className="card space-y-3 p-5">
          <input type="hidden" name="courseId" value={course.id} />
          <h2 className="font-semibold text-slate-800">Langues</h2>
          <LanguageSelectors values={course.programme.languages} />
          <SaveButton>Enregistrer les langues</SaveButton>
        </form>
      )}

      <EditCourseForm
        course={{ id: course.id, title: course.title, description: course.description }}
        sessions={sessions}
        trainers={trainers}
      />
    </div>
  );
}
