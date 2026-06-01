const LANGS = ["EN", "FR", "DE", "LU"];

// Four dropdowns to choose up to 4 languages for an activity.
// Submits fields lang0..lang3; duplicates/empties are de-duplicated server-side.
export function LanguageSelectors({ values = [] }: { values?: string[] }) {
  return (
    <div>
      <span className="label">Langues de l&apos;activité</span>
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <select key={i} name={`lang${i}`} defaultValue={values[i] ?? ""} className="input w-24">
            <option value="">—</option>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}

// Read the 4 language fields from a FormData into a clean, de-duplicated array.
export function readLanguages(formData: FormData): string[] {
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    const v = String(formData.get(`lang${i}`) ?? "").trim().toUpperCase();
    if (LANGS.includes(v) && !out.includes(v)) out.push(v);
  }
  return out;
}
