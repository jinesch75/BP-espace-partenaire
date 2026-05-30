import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/session";
import { addTrainer, updateTrainer, deleteTrainer } from "@/app/partner/_actions";

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
        <h1 className="section-title">Formateurs</h1>
        <p className="text-sm text-slate-500">
          {partner.name} · ces formateurs apparaissent dans la liste déroulante
          lorsque vous créez un cours.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Ajouter un formateur</h2>
        <form action={addTrainer} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="firstName">
              Prénom
            </label>
            <input id="firstName" name="firstName" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Nom de famille
            </label>
            <input id="lastName" name="lastName" className="input" />
          </div>
          <button className="btn-primary">Ajouter</button>
        </form>
      </div>

      <div className="space-y-3">
        {trainers.map((t) => (
          <div key={t.id} className="card p-4">
            <form action={updateTrainer} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="trainerId" value={t.id} />
              <div>
                <label className="label">Prénom</label>
                <input name="firstName" className="input" defaultValue={t.firstName} />
              </div>
              <div>
                <label className="label">Nom de famille</label>
                <input name="lastName" className="input" defaultValue={t.lastName} />
              </div>
              <button className="btn-primary">Enregistrer</button>
            </form>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span>{t._count.sessions} session(s) affectée(s)</span>
              <form action={deleteTrainer}>
                <input type="hidden" name="trainerId" value={t.id} />
                <button className="text-red-600 hover:underline">Supprimer</button>
              </form>
            </div>
          </div>
        ))}
        {trainers.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            Aucun formateur pour l&apos;instant.
          </div>
        )}
      </div>
    </div>
  );
}
