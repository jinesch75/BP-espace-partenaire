"use client";

import { useState } from "react";
import { createCourse } from "@/app/partner/_actions";
import { SaveButton } from "@/app/_components/SaveButton";

type Trainer = { id: number; firstName: string; lastName: string };
type Programme = { id: number; name: string; description: string | null };

function TrainerPicker({ prefix, trainers }: { prefix: string; trainers: Trainer[] }) {
  const [value, setValue] = useState("");
  return (
    <div>
      <label className="label">Intervenant/Formateur</label>
      <select
        name={`${prefix}trainerId`}
        className="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">— aucun —</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.firstName} {t.lastName}
          </option>
        ))}
        <option value="new">+ Ajouter un nouvel intervenant/formateur…</option>
      </select>
      {value === "new" && (
        <div className="mt-2 flex gap-2">
          <input name={`${prefix}newFirst`} placeholder="Prénom" className="input" />
          <input name={`${prefix}newLast`} placeholder="Nom de famille" className="input" />
        </div>
      )}
    </div>
  );
}

function SessionBlock({
  index,
  prefix,
  trainers,
  onRemove,
  removable,
  defaultDate,
  defaultTitle,
  defaultDescription,
}: {
  index: number;
  prefix: string;
  trainers: Trainer[];
  onRemove?: () => void;
  removable: boolean;
  defaultDate?: string;
  defaultTitle: string;
  defaultDescription: string;
}) {
  const [online, setOnline] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Séance {index + 1}</span>
        {removable && onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
            Retirer
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Titre de la séance</label>
          <input
            name={`${prefix}title`}
            className="input"
            defaultValue={defaultTitle}
            key={`t-${defaultTitle}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description de la séance</label>
          <textarea
            name={`${prefix}description`}
            rows={2}
            className="input"
            defaultValue={defaultDescription}
            key={`d-${defaultDescription}`}
          />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" name={`${prefix}date`} className="input" defaultValue={defaultDate} required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label">Début</label>
            <input type="time" name={`${prefix}startTime`} className="input" required />
          </div>
          <div className="flex-1">
            <label className="label">Fin</label>
            <input type="time" name={`${prefix}endTime`} className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Places disponibles</label>
          <input type="number" min={0} name={`${prefix}places`} className="input" defaultValue={12} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={`${prefix}isOnline`}
              checked={online}
              onChange={(e) => setOnline(e.target.checked)}
            />
            Cette séance est en ligne
          </label>
        </div>
        {online ? (
          <div className="sm:col-span-2">
            <label className="label">Lien de réunion Teams</label>
            <input name={`${prefix}teamsLink`} placeholder="https://teams.microsoft.com/..." className="input" />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="label">Lieu / adresse</label>
            <input name={`${prefix}location`} className="input" />
          </div>
        )}
        <div className="sm:col-span-2">
          <TrainerPicker prefix={prefix} trainers={trainers} />
        </div>
      </div>
    </div>
  );
}

export default function CourseForm({
  trainers,
  programmes,
  partnerName,
  initialProgrammeId = "",
  initialDate = "",
}: {
  trainers: Trainer[];
  programmes: Programme[];
  partnerName: string;
  initialProgrammeId?: string;
  initialDate?: string;
}) {
  const [type, setType] = useState<"SINGLE" | "MULTI">("SINGLE");
  const [keys, setKeys] = useState<number[]>([0]);
  const validInitial =
    initialProgrammeId && programmes.some((p) => String(p.id) === initialProgrammeId)
      ? initialProgrammeId
      : "";
  const [programme, setProgramme] = useState(validInitial);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Prefill values for séances, from the chosen programme (or the new one).
  const selectedProg =
    programme && programme !== "new"
      ? programmes.find((p) => String(p.id) === programme)
      : null;
  const prefillTitle =
    programme === "new" ? newName : selectedProg?.name ?? "";
  const prefillDesc =
    programme === "new" ? newDesc : selectedProg?.description ?? "";

  const multiKeys = type === "MULTI" ? keys : [0];

  return (
    <form action={createCourse} className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Activités proposées par {partnerName}</label>
          <select
            className="input"
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            required
          >
            <option value="">— choisir un programme —</option>
            {programmes.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
            <option value="new">+ Nouveau programme…</option>
          </select>

          {programme === "new" && (
            <div className="mt-2 space-y-2">
              <input
                name="newProgrammeName"
                placeholder="Nom du nouveau programme (ex. DAPA 1)"
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <textarea
                name="newProgrammeDescription"
                placeholder="Description du programme"
                rows={2}
                className="input"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          )}
          {programme !== "new" && programme !== "" && (
            <input type="hidden" name="programmeId" value={programme} />
          )}
          <p className="mt-1 text-xs text-slate-500">
            L&apos;activité reprend le titre et la description du programme. Les
            informations (catalogue, type, domaine, badges) sont définies sur le
            programme par l&apos;administrateur.
          </p>
        </div>
        <div>
          <label className="label">Format de l&apos;activité</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {([
              ["SINGLE", "Événement unique"],
              ["MULTI", "Sessions multiples"],
            ] as const).map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value={val}
                  checked={type === val}
                  onChange={() => setType(val)}
                />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <input type="hidden" name="sessionCount" value={multiKeys.length} />
        {multiKeys.map((k, i) => (
          <SessionBlock
            key={k}
            index={i}
            prefix={`s_${i}_`}
            trainers={trainers}
            removable={type === "MULTI" && multiKeys.length > 1}
            onRemove={() => setKeys((arr) => arr.filter((x) => x !== k))}
            defaultDate={i === 0 ? initialDate : undefined}
            defaultTitle={prefillTitle}
            defaultDescription={prefillDesc}
          />
        ))}
        {type === "MULTI" && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setKeys((arr) => [...arr, (arr[arr.length - 1] ?? 0) + 1])}
          >
            + Ajouter une autre séance
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <SaveButton>Créer l&apos;activité</SaveButton>
        <a href="/partner" className="btn-secondary">
          Annuler
        </a>
      </div>
    </form>
  );
}
