import { setPresence } from "@/app/_actions/presence";

export function PresenceControls({
  assignmentId,
  presence,
  presentLabel = "Présent",
  absentLabel = "Absent",
}: {
  assignmentId: number;
  presence: string | null;
  presentLabel?: string;
  absentLabel?: string;
}) {
  const base =
    "rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors";
  return (
    <div className="flex items-center gap-1">
      <form action={setPresence}>
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input
          type="hidden"
          name="presence"
          value={presence === "PRESENT" ? "" : "PRESENT"}
        />
        <button
          className={`${base} ${
            presence === "PRESENT"
              ? "border-green-600 bg-green-600 text-white"
              : "border-slate-300 text-slate-500 hover:border-green-500 hover:text-green-600"
          }`}
        >
          {presentLabel}
        </button>
      </form>
      <form action={setPresence}>
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input
          type="hidden"
          name="presence"
          value={presence === "ABSENT" ? "" : "ABSENT"}
        />
        <button
          className={`${base} ${
            presence === "ABSENT"
              ? "border-red-600 bg-red-600 text-white"
              : "border-slate-300 text-slate-500 hover:border-red-500 hover:text-red-600"
          }`}
        >
          {absentLabel}
        </button>
      </form>
    </div>
  );
}
