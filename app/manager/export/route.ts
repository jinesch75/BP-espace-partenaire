import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decryptSensitive } from "@/lib/crypto";

export const dynamic = "force-dynamic";

function isoDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export async function GET() {
  const session = getSession();
  if (session?.role !== "MANAGER")
    return new Response("Forbidden", { status: 403 });

  const courses = await prisma.course.findMany({
    orderBy: [{ partnerId: "asc" }, { title: "asc" }],
    include: {
      partner: true,
      sessions: { orderBy: { sequence: "asc" } },
      topics: true,
      badges: true,
    },
  });

  const assignments = await prisma.traineeAssignment.findMany({
    orderBy: { assignedDate: "asc" },
    include: { trainee: true, course: { include: { partner: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Espace partenaire";

  const cs = wb.addWorksheet("Courses");
  cs.columns = [
    { header: "Course ID", key: "id", width: 10 },
    { header: "Partner", key: "partner", width: 28 },
    { header: "Title", key: "title", width: 28 },
    { header: "Type", key: "type", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Population", key: "population", width: 12 },
    { header: "Visible", key: "visible", width: 10 },
    { header: "Topics", key: "topics", width: 20 },
    { header: "Badges", key: "badges", width: 20 },
    { header: "Sessions", key: "sessions", width: 10 },
    { header: "First date", key: "first", width: 14 },
  ];
  cs.getRow(1).font = { bold: true };
  for (const c of courses) {
    cs.addRow({
      id: c.id,
      partner: c.partner.name,
      title: c.title,
      type: c.recurring ? "Recurring weekly" : c.type === "MULTI" ? "Multi-session" : "Single event",
      status: c.status,
      population: c.population ?? "—",
      visible: c.visibleInCatalogue ? "Yes" : "No",
      topics: c.topics.map((t) => t.name).join(", "),
      badges: c.badges.map((b) => b.name).join(", "),
      sessions: c.sessions.length,
      first: c.sessions[0] ? isoDate(c.sessions[0].date) : "",
    });
  }

  const as = wb.addWorksheet("ONA assignments");
  as.columns = [
    { header: "Family name", key: "last", width: 20 },
    { header: "First name", key: "first", width: 20 },
    { header: "National number", key: "nn", width: 24 },
    { header: "Course", key: "course", width: 16 },
    { header: "Partner", key: "partner", width: 24 },
    { header: "Assigned date", key: "date", width: 14 },
  ];
  as.getRow(1).font = { bold: true };
  for (const a of assignments) {
    as.addRow({
      last: a.trainee.lastName,
      first: a.trainee.firstName,
      nn: decryptSensitive(a.trainee.nationalNumber),
      course: a.course.title,
      partner: a.course.partner.name,
      date: isoDate(a.assignedDate),
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="espace-partenaire-export.xlsx"',
    },
  });
}
