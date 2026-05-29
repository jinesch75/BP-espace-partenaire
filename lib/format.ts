export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-BE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function courseTypeLabel(type: string, recurring: boolean): string {
  if (recurring) return "Recurring weekly";
  return type === "MULTI" ? "Multi-session" : "Single event";
}

export function statusClasses(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-700";
    case "DRAFT":
      return "bg-slate-100 text-slate-600";
    case "COMPLETED":
      return "bg-blue-100 text-blue-700";
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function populationLabel(pop: string | null): string {
  if (pop === "POP1") return "Population 1";
  if (pop === "POP2") return "Population 2";
  return "—";
}
