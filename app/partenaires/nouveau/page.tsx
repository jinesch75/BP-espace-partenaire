import Link from "next/link";
import { createPartnerPublic } from "./actions";
import { SaveButton } from "@/app/_components/SaveButton";

export const dynamic = "force-dynamic";

export default function NewPartnerPublicPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-brand hover:underline">
          ← Retour à l&apos;accueil
        </Link>
        <h1 className="section-title mt-2">Nouveau partenaire</h1>
        <p className="mt-1 text-sm text-slate-500">
          Le partenaire apparaîtra ensuite comme une tuile dans « Accès
          partenaires ».
        </p>
      </div>

      {searchParams.error === "name" && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          Veuillez saisir un nom de partenaire.
        </div>
      )}

      <form action={createPartnerPublic} className="card space-y-4 p-5">
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
            <textarea name="description" rows={3} className="input" />
          </div>
        </div>
        <div className="flex gap-3">
          <SaveButton>Créer le partenaire</SaveButton>
          <Link href="/" className="btn-secondary">
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
