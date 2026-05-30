import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import CourseForm from "./CourseForm";

export const dynamic = "force-dynamic";

export default async function NewCoursePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const partner = await requirePartner();
  const trainers = await prisma.trainer.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/partner" className="text-sm text-brand hover:underline">
          ← Retour aux activités du {partner.name}
        </Link>
        <h1 className="section-title mt-2">Nouvelle activité</h1>
      </div>

      {searchParams.error === "title" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez saisir un titre d'activité.
        </div>
      )}
      {searchParams.error === "session" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez ajouter au moins une session avec une date.
        </div>
      )}

      <CourseForm trainers={trainers} />
    </div>
  );
}
