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
          ← Back to my courses
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">New course</h1>
      </div>

      {searchParams.error === "title" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Please enter a course title.
        </div>
      )}
      {searchParams.error === "session" && (
        <div className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          Please add at least one session with a date.
        </div>
      )}

      <CourseForm trainers={trainers} />
    </div>
  );
}
