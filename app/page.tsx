import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  enterAsManager,
  enterAsPartner,
  enterAsTrainer,
} from "@/app/_actions/demo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const partners = await prisma.partner.findMany({
    orderBy: [{ managesTrainees: "desc" }, { name: "asc" }],
    include: {
      trainers: { orderBy: { lastName: "asc" } },
      _count: { select: { courses: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">Accès démo — choisissez un rôle</h1>
          <p className="mt-1 text-sm text-slate-500">
            Aucun compte nécessaire. Cliquez sur un rôle pour explorer cette vue.
          </p>
        </div>
        <Link href="/login" className="btn-secondary">
          Se connecter avec un compte
        </Link>
      </div>

      {/* Administrateur */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Accès administrateur</h2>
        <p className="mt-1 text-sm text-slate-500">
          Voir tous les cours, définir la population / les thèmes / les badges /
          la visibilité dans le catalogue, et consulter la base des participants.
        </p>
        <form action={enterAsManager} className="mt-3">
          <button className="btn-primary">Entrer comme administrateur</button>
        </form>
      </section>

      {/* Partenaires */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Accès partenaires</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chaque partenaire gère ses propres cours et formateurs. ONA peut aussi
          affecter des participants.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <form key={p.id} action={enterAsPartner}>
              <input type="hidden" name="partnerId" value={p.id} />
              <button className="card flex w-full items-center justify-between p-4 text-left hover:border-brand hover:shadow">
                <span>
                  <span className="block font-medium text-slate-800">
                    {p.name}
                    {p.managesTrainees && (
                      <span className="badge-pill ml-2 bg-amber-100 text-amber-700">
                        ONA
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p._count.courses} cours · {p.trainers.length} formateurs
                  </span>
                </span>
                <span className="text-brand">→</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* Formateur */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Accès formateur</h2>
        <p className="mt-1 text-sm text-slate-500">
          Un formateur voit les cours auxquels il est affecté et qui y est inscrit.
        </p>
        <form action={enterAsTrainer} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px]">
            <label className="label" htmlFor="trainerId">
              Choisir un formateur
            </label>
            <select id="trainerId" name="trainerId" className="input" required>
              <option value="">— sélectionner —</option>
              {partners.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  {p.trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button className="btn-primary">Entrer comme formateur</button>
        </form>
      </section>
    </div>
  );
}
