import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import CourseForm from "./CourseForm";

export const dynamic = "force-dynamic";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: { error?: string; programmeId?: string; date?: string };
}) {
  const partner = await requirePartner();
  const [trainers, programmes] = await Promise.all([
    prisma.trainer.findMany({
      where: { partnerId: partner.id },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.programme.findMany({
      where: { partnerId: partner.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner" className="text-sm text-brand hover:underline">
          ← Retour aux activités du {partner.name}
        </Link>
        <h1 className="section-title mt-2">Nouvelle activité</h1>
      </div>

      {searchParams.error === "programme" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez choisir un programme (ou en créer un nouveau).
        </div>
      )}
      {searchParams.error === "session" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez ajouter au moins une session avec une date.
        </div>
      )}

      <CourseForm
        trainers={trainers}
        programmes={programmes}
        initialProgrammeId={searchParams.programmeId ?? ""}
        initialDate={searchParams.date ?? ""}
      />
    </div>
  );
}
