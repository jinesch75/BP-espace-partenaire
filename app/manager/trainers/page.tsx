import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import {
  updateTrainerAsManager,
  deleteTrainerAsManager,
} from "@/app/manager/_actions";
import { SaveButton } from "@/app/_components/SaveButton";

export const dynamic = "force-dynamic";

export default async function ManagerTrainers() {
  requireManager();
  const trainers = await prisma.trainer.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      partner: true,
      _count: { select: { sessions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/manager" className="text-sm text-brand hover:underline">
          ← Retour au tableau de bord
        </Link>
        <h1 className="section-title mt-2">Intervenants/Formateurs</h1>
        <p className="text-sm text-slate-500">
          {trainers.length} intervenants/formateurs au total, tous partenaires confondus.
        </p>
      </div>

      <div className="space-y-3">
        {trainers.map((t) => (
          <div key={t.id} className="card p-4">
            <form
              action={updateTrainerAsManager}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="trainerId" value={t.id} />
              <div>
                <label className="label">Prénom</label>
                <input name="firstName" className="input" defaultValue={t.firstName} />
              </div>
              <div>
                <label className="label">Nom de famille</label>
                <input name="lastName" className="input" defaultValue={t.lastName} />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input name="email" type="email" className="input" defaultValue={t.email ?? ""} />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input name="phone" className="input" defaultValue={t.phone ?? ""} />
              </div>
              <div>
                <span className="label">Partenaire</span>
                <div className="px-1 py-2 text-sm text-slate-600">{t.partner.name}</div>
              </div>
              <SaveButton>Enregistrer</SaveButton>
            </form>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span>{t._count.sessions} session(s) affectée(s)</span>
              <form action={deleteTrainerAsManager}>
                <input type="hidden" name="trainerId" value={t.id} />
                <button className="text-red-600 hover:underline">Supprimer</button>
              </form>
            </div>
          </div>
        ))}
        {trainers.length === 0 && (
          <div className="card p-6 text-center text-sm text-slate-500">
            Aucun intervenant/formateur pour l&apos;instant.
          </div>
        )}
      </div>
    </div>
  );
}
