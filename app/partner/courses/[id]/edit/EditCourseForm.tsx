"use client";

import { useState } from "react";
import { updateCourse } from "@/app/partner/_actions";
import { SaveButton } from "@/app/_components/SaveButton";

type Trainer = { id: number; firstName: string; lastName: string };
type SessionData = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  isOnline: boolean;
  location: string | null;
  teamsLink: string | null;
  placesAvailable: number;
  trainerId: number | null;
};

const blank = (): SessionData => ({
  id: 0,
  date: "",
  startTime: "",
  endTime: "",
  isOnline: false,
  location: "",
  teamsLink: "",
  placesAvailable: 12,
  trainerId: null,
});

function TrainerPicker({
  prefix,
  trainers,
  initial,
}: {
  prefix: string;
  trainers: Trainer[];
  initial: number | null;
}) {
  const [value, setValue] = useState(initial ? String(initial) : "");
  return (
    <div>
      <label className="label">Intervenant</label>
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
        <option value="new">+ Ajouter un nouvel intervenant…</option>
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
  init,
  trainers,
  onRemove,
  removable,
}: {
  index: number;
  init: SessionData;
  trainers: Trainer[];
  onRemove: () => void;
  removable: boolean;
}) {
  const prefix = `s_${index}_`;
  const [online, setOnline] = useState(init.isOnline);
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <input type="hidden" name={`${prefix}id`} value={init.id} />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">Session {index + 1}</span>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
            Retirer
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Date</label>
          <input type="date" name={`${prefix}date`} className="input" defaultValue={init.date} required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label">Début</label>
            <input type="time" name={`${prefix}startTime`} className="input" defaultValue={init.startTime} required />
          </div>
          <div className="flex-1">
            <label className="label">Fin</label>
            <input type="time" name={`${prefix}endTime`} className="input" defaultValue={init.endTime} required />
          </div>
        </div>
        <div>
          <label className="label">Places disponibles</label>
          <input
            type="number"
            min={0}
            name={`${prefix}places`}
            className="input"
            defaultValue={init.placesAvailable}
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
              defaultValue={init.teamsLink ?? ""}
              placeholder="https://teams.microsoft.com/..."
              className="input"
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="label">Lieu / adresse</label>
            <input name={`${prefix}location`} defaultValue={init.location ?? ""} className="input" />
          </div>
        )}
        <div className="sm:col-span-2">
          <TrainerPicker prefix={prefix} trainers={trainers} initial={init.trainerId} />
        </div>
      </div>
    </div>
  );
}

export default function EditCourseForm({
  course,
  sessions,
  trainers,
  action = updateCourse,
  cancelHref,
}: {
  course: { id: number; title: string; description: string | null };
  sessions: SessionData[];
  trainers: Trainer[];
  action?: (formData: FormData) => void | Promise<void>;
  cancelHref?: string;
}) {
  const [rows, setRows] = useState(
    sessions.map((s, i) => ({ key: i, init: s }))
  );
  const backHref = cancelHref ?? `/partner/courses/${course.id}`;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="courseId" value={course.id} />
      <input type="hidden" name="sessionCount" value={rows.length} />

      <div className="card space-y-4 p-5">
        <div>
          <label className="label">Titre de l'activité</label>
          <input name="title" className="input" defaultValue={course.title} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            name="description"
            rows={3}
            className="input"
            defaultValue={course.description ?? ""}
          />
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((r, i) => (
          <SessionBlock
            key={r.key}
            index={i}
            init={r.init}
            trainers={trainers}
            removable={rows.length > 1}
            onRemove={() => setRows((arr) => arr.filter((x) => x.key !== r.key))}
          />
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            setRows((arr) => [
              ...arr,
              { key: (arr[arr.length - 1]?.key ?? 0) + 1, init: blank() },
            ])
          }
        >
          + Ajouter une autre session
        </button>
      </div>

      <div className="flex gap-3">
        <SaveButton>Enregistrer les modifications</SaveButton>
        <a href={backHref} className="btn-secondary">
          Annuler
        </a>
      </div>
    </form>
  );
}
