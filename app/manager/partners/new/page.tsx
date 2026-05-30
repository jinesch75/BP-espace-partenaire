import Link from "next/link";
import { requireManager } from "@/lib/session";
import { createPartner } from "@/app/manager/_actions";

export const dynamic = "force-dynamic";

export default function NewPartnerPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  requireManager();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/manager/partners" className="text-sm text-brand hover:underline">
          ← Retour aux partenaires
        </Link>
        <h1 className="section-title mt-2">Ajouter un partenaire</h1>
      </div>

      {searchParams.error === "name" && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez saisir un nom de partenaire.
        </div>
      )}
      {searchParams.error === "email" && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          Cet e-mail de connexion est déjà utilisé par un autre partenaire.
        </div>
      )}

      <div className="card p-5">
        <form action={createPartner} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom du partenaire *</label>
              <input name="name" className="input" required />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="managesTrainees" />
                Peut affecter des participants (Rôle DPI)
              </label>
            </div>
            <div>
              <label className="label">E-mail de connexion</label>
              <input name="loginEmail" type="email" className="input" placeholder="partenaire@espace.lu" />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input name="password" type="text" className="input" placeholder="laisser vide si non utilisé" />
            </div>
            <div>
              <label className="label">E-mail de contact</label>
              <input name="contactEmail" type="email" className="input" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input name="phone" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input name="address" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea name="description" rows={2} className="input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary">Ajouter le partenaire</button>
            <Link href="/manager/partners" className="btn-secondary">
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
