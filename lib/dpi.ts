// The six courses of the DPI pathway, tracked as columns on the
// "Demandeurs de protection internationale (DPI)" page.

export function norm(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type DpiColumn = {
  key: string;
  label: string;
  match: (title: string) => boolean;
};

export const DPI_COLUMNS: DpiColumn[] = [
  { key: "DAPA1", label: "DAPA 1", match: (t) => norm(t) === "DAPA1" },
  { key: "DAPA2", label: "DAPA 2", match: (t) => norm(t) === "DAPA2" },
  { key: "DAPA3", label: "DAPA 3", match: (t) => norm(t) === "DAPA3" },
  { key: "DAPA4", label: "DAPA 4", match: (t) => norm(t) === "DAPA4" },
  { key: "DAPA5", label: "DAPA 5", match: (t) => norm(t) === "DAPA5" },
  {
    key: "BIENV",
    label: "Bienvenue",
    match: (t) => /bienvenue/i.test(t) || norm(t) === "WELCOME",
  },
];

export function dpiKeyOf(title: string): string | null {
  for (const c of DPI_COLUMNS) if (c.match(title)) return c.key;
  return null;
}

// Prefer the explicit dpiStep (set from the programme); fall back to the title.
export function courseDpiKey(course: {
  dpiStep?: string | null;
  title?: string;
}): string | null {
  if (course.dpiStep) return course.dpiStep;
  return course.title ? dpiKeyOf(course.title) : null;
}
