"use client";

import { useState } from "react";
import { updatePartnerInfo } from "@/app/partner/_actions";
import { SaveButton } from "@/app/_components/SaveButton";

type Partner = {
  name: string;
  description: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
};

export function PartnerInfo({ partner }: { partner: Partner }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="section-title">{partner.name}</h1>
            {partner.description && (
              <p className="mt-2 text-sm text-slate-600">{partner.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              {partner.contactEmail && (
                <span>
                  <span className="font-semibold">E-mail :</span> {partner.contactEmail}
                </span>
              )}
              {partner.phone && (
                <span>
                  <span className="font-semibold">Téléphone :</span> {partner.phone}
                </span>
              )}
              {partner.address && (
                <span>
                  <span className="font-semibold">Adresse :</span> {partner.address}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="btn-secondary">
            Modifier les informations
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={updatePartnerInfo} className="card space-y-4 p-5">
      <div>
        <label className="label">Nom</label>
        <input name="name" className="input" defaultValue={partner.name} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          name="description"
          rows={2}
          className="input"
          defaultValue={partner.description ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">E-mail</label>
          <input
            name="contactEmail"
            type="email"
            className="input"
            defaultValue={partner.contactEmail ?? ""}
          />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input name="phone" className="input" defaultValue={partner.phone ?? ""} />
        </div>
        <div>
          <label className="label">Adresse</label>
          <input name="address" className="input" defaultValue={partner.address ?? ""} />
        </div>
      </div>
      <div className="flex gap-3">
        <SaveButton>Enregistrer mes informations</SaveButton>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  );
}
