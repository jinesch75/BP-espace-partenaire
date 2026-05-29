import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import { addTrainer } from "@/app/partner/_actions";

export const dynamic = "force-dynamic";

export default async function TrainersPage() {
  const partner = await requirePartner();
  const trainers = await prisma.trainer.findMany({
    where: { partnerId: partner.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { sessions: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trainers</h1>
        <p className="text-sm text-slate-500">
          {partner.name} · these appear in the trainer dropdown when you create a
          course.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Add a trainer</h2>
        <form action={addTrainer} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="firstName">
              First name
            </label>
            <input id="firstName" name="firstName" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Last name
            </label>
            <input id="lastName" name="lastName" className="input" />
          </div>
          <button className="btn-primary">Add</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Last name</th>
              <th className="th">First name</th>
              <th className="th">Sessions assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trainers.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.lastName}</td>
                <td className="td">{t.firstName}</td>
                <td className="td">{t._count.sessions}</td>
              </tr>
            ))}
            {trainers.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={3}>
                  No trainers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
