type IcsSession = {
  id: number;
  sequence: number;
  date: Date;
  startTime: string;
  endTime: string;
  isOnline: boolean;
  location: string | null;
  teamsLink: string | null;
};

function pad(n: number | string): string {
  return String(n).padStart(2, "0");
}

function fmt(date: Date, time: string): string {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const da = pad(d.getUTCDate());
  const [hh = "00", mm = "00"] = (time || "").split(":");
  return `${y}${mo}${da}T${pad(hh)}${pad(mm)}00`;
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(
  courseId: number,
  courseTitle: string,
  sessions: IcsSession[]
): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Espace partenaire//Biergerpakt//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const s of sessions) {
    const where = s.isOnline ? "Online" : s.location ?? "";
    const desc = s.isOnline && s.teamsLink ? `Teams: ${s.teamsLink}` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:course-${courseId}-session-${s.id}@espace-partenaire`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${fmt(s.date, s.startTime)}`,
      `DTEND:${fmt(s.date, s.endTime)}`,
      `SUMMARY:${escape(courseTitle)} (session ${s.sequence})`,
      `LOCATION:${escape(where)}`,
      `DESCRIPTION:${escape(desc)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
