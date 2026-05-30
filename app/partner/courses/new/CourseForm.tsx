"use client";

import { useState } from "react";
import { createCourse } from "@/app/partner/_actions";

type Trainer = { id: number; firstName: string; lastName: string };

function TrainerPicker({
  prefix,
  trainers,
}: {
  prefix: string;
  trainers: Trainer[];
}) {
  const [value, setValue] = useState("");
  return (
    <div>
      <label className="label">Formateur</label>
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
        <option value="new">+ Ajouter un nouveau formateur…</option>
      </select>
      {value === "new" && (
        <div className="mt-2 flex gap-2">
          <input
            name={`${prefix}newFirst`}
            placeholder="Prénom"
            className="input"
          />
          <input
            name={`${prefix}newLast`}
            placeholder="Nom de famille"
            className="input"
          />
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
}: {
  index: number;
  prefix: string;
  trainers: Trainer[];
  onRemove?: () => void;
  removable: boolean;
}) {
  const [online, setOnline] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          Session {index + 1}
        </span>
        {removable && onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
            Retirer
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Date</label>
          <input type="date" name={`${prefix}date`} className="input" required />
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
          <input
            type="number"
            min={0}
            name={`${prefix}places`}
            className="input"
            defaultValue={12}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={`${prefix}isOnline`}
              checked={online}
              onChange={(e) => setOnline(e.target.checked)}
            />
            Cette session est en ligne
          </label>
        </div>
        {online ? (
          <div className="sm:col-span-2">
            <label className="label">Lien de réunion Teams</label>
            <input
              name={`${prefix}teamsLink`}
              placeholder="https://teams.microsoft.com/..."
              className="input"
            />
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

export default function CourseForm({ trainers }: { trainers: Trainer[] }) {
  const [type, setType] = useState<"SINGLE" | "MULTI" | "RECURRING">("SINGLE");
  const [keys, setKeys] = useState<number[]>([0]);
  const [recOnline, setRecOnline] = useState(false);
  const [endMode, setEndMode] = useState<"count" | "date">("count");

  const multiKeys = type === "MULTI" ? keys : [0];

  return (
    <form action={createCourse} className="space-y-6">
      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Titre du cours</label>
          <input name="title" className="input" required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea name="description" rows={3} className="input" />
        </div>
        <div>
          <label className="label">Format du cours</label>
          <div className="flex flex-wrap gap-4 text-sm">
            {([
              ["SINGLE", "Événement unique"],
              ["MULTI", "Sessions multiples"],
              ["RECURRING", "Hebdomadaire récurrent"],
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

      {type === "RECURRING" ? (
        <div className="card space-y-4 p-5">
          <h3 className="font-semibold text-slate-700">Modèle hebdomadaire</h3>
          <p className="text-xs text-slate-500">
            Toutes les sessions partagent le même jour, la même heure, le même
            lieu et le même formateur. Nous générons un cours à sessions multiples
            que vous pourrez affiner ensuite.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Date de la première session</label>
              <input type="date" name="rec_firstDate" className="input" required />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Début</label>
                <input type="time" name="rec_startTime" className="input" required />
              </div>
              <div className="flex-1">
                <label className="label">Fin</label>
                <input type="time" name="rec_endTime" className="input" required />
              </div>
            </div>
            <div>
              <label className="label">Places disponibles</label>
              <input type="number" min={0} name="rec_places" className="input" defaultValue={12} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="rec_isOnline"
                  checked={recOnline}
                  onChange={(e) => setRecOnline(e.target.checked)}
                />
                Sessions en ligne
              </label>
            </div>
            {recOnline ? (
              <div className="sm:col-span-2">
                <label className="label">Lien de réunion Teams</label>
                <input name="rec_teamsLink" className="input" placeholder="https://teams.microsoft.com/..." />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="label">Lieu / adresse</label>
                <input name="rec_location" className="input" />
              </div>
            )}
            <div className="sm:col-span-2">
              <TrainerPicker prefix="rec_" trainers={trainers} />
            </div>
          </div>

          <div>
            <label className="label">Fin de la série</label>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rec_endMode"
                  value="count"
                  checked={endMode === "count"}
                  onChange={() => setEndMode("count")}
                />
                Après
                <input
                  type="number"
                  min={1}
                  max={52}
                  name="rec_count"
                  className="input w-20"
                  defaultValue={6}
                  disabled={endMode !== "count"}
                />
                sessions
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rec_endMode"
                  value="date"
                  checked={endMode === "date"}
                  onChange={() => setEndMode("date")}
                />
                À la date
                <input
                  type="date"
                  name="rec_endDate"
                  className="input"
                  disabled={endMode !== "date"}
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
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
            />
          ))}
          {type === "MULTI" && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setKeys((arr) => [...arr, (arr[arr.length - 1] ?? 0) + 1])}
            >
              + Ajouter une autre session
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-primary">Créer le cours</button>
        <a href="/partner" className="btn-secondary">
          Annuler
        </a>
      </div>
    </form>
  );
}
