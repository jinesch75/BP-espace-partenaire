import { setAttendance } from "@/app/_actions/attendance";
import { formatDate } from "@/lib/format";

type Sess = { id: number; sequence: number; date: Date | string };
type Participant = {
  assignmentId: number;
  traineeId: number;
  lastName: string;
  firstName: string;
};

function Toggle({
  traineeId,
  sessionId,
  status,
}: {
  traineeId: number;
  sessionId: number;
  status: string | null;
}) {
  const base = "rounded border px-1.5 py-0.5 text-xs font-bold leading-none transition-colors";
  return (
    <span className="inline-flex gap-1">
      <form action={setAttendance}>
        <input type="hidden" name="traineeId" value={traineeId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="status" value={status === "PRESENT" ? "" : "PRESENT"} />
        <button
          title="Présent"
          className={`${base} ${
            status === "PRESENT"
              ? "border-green-600 bg-green-600 text-white"
              : "border-slate-300 text-slate-400 hover:border-green-500 hover:text-green-600"
          }`}
        >
          ✓
        </button>
      </form>
      <form action={setAttendance}>
        <input type="hidden" name="traineeId" value={traineeId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="status" value={status === "ABSENT" ? "" : "ABSENT"} />
        <button
          title="Absent"
          className={`${base} ${
            status === "ABSENT"
              ? "border-red-600 bg-red-600 text-white"
              : "border-slate-300 text-slate-400 hover:border-red-500 hover:text-red-600"
          }`}
        >
          ✗
        </button>
      </form>
    </span>
  );
}

export function AttendanceGrid({
  sessions,
  participants,
  attendance,
}: {
  sessions: Sess[];
  participants: Participant[];
  attendance: Record<string, string>; // key `${traineeId}-${sessionId}` -> status
}) {
  return (
    <table className="w-full">
      <thead className="bg-surface">
        <tr>
          <th className="th">Participant</th>
          {sessions.map((s) => (
            <th key={s.id} className="th whitespace-nowrap text-center">
              S{s.sequence}
              <span className="block font-normal normal-case text-slate-400">
                {formatDate(s.date)}
              </span>
            </th>
          ))}
          <th className="th text-center">Complété</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {participants.map((p) => {
          const statuses = sessions.map((s) => attendance[`${p.traineeId}-${s.id}`] ?? null);
          const complete =
            sessions.length > 0 && statuses.every((st) => st === "PRESENT");
          return (
            <tr key={p.assignmentId}>
              <td className="td whitespace-nowrap">
                {p.lastName} {p.firstName}
              </td>
              {sessions.map((s) => (
                <td key={s.id} className="td text-center">
                  <Toggle
                    traineeId={p.traineeId}
                    sessionId={s.id}
                    status={attendance[`${p.traineeId}-${s.id}`] ?? null}
                  />
                </td>
              ))}
              <td className="td text-center">
                {complete ? (
                  <span className="badge-pill bg-green-100 text-green-700">Oui</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          );
        })}
        {participants.length === 0 && (
          <tr>
            <td className="td text-slate-500" colSpan={sessions.length + 2}>
              Aucun participant.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
