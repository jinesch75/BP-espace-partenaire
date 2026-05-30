import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decryptSensitive } from "@/lib/crypto";
import { courseTypeLabel, statusLabel, populationLabel } from "@/lib/format";

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
      topicPrimary: true,
      topicSecondary: true,
      topicTertiary: true,
      categoryPrimary: true,
      categorySecondary: true,
      categoryTertiary: true,
      badges: true,
    },
  });

  const assignments = await prisma.traineeAssignment.findMany({
    orderBy: { assignedDate: "asc" },
    include: { trainee: true, course: { include: { partner: true } } },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Espace partenaire";

  const cs = wb.addWorksheet("Activités");
  cs.columns = [
    { header: "ID activité", key: "id", width: 10 },
    { header: "Partenaire", key: "partner", width: 28 },
    { header: "Titre", key: "title", width: 28 },
    { header: "Type", key: "type", width: 18 },
    { header: "Statut", key: "status", width: 12 },
    { header: "Catalogue", key: "population", width: 18 },
    { header: "Visible", key: "visible", width: 10 },
    { header: "Type principal", key: "topic1", width: 22 },
    { header: "Type secondaire", key: "topic2", width: 22 },
    { header: "Type tertiaire", key: "topic3", width: 22 },
    { header: "Domaine de la loi principal", key: "cat1", width: 26 },
    { header: "Domaine de la loi secondaire", key: "cat2", width: 26 },
    { header: "Domaine de la loi tertiaire", key: "cat3", width: 26 },
    { header: "Badges", key: "badges", width: 20 },
    { header: "Sessions", key: "sessions", width: 10 },
    { header: "Première date", key: "first", width: 14 },
  ];
  cs.getRow(1).font = { bold: true };
  for (const c of courses) {
    cs.addRow({
      id: c.id,
      partner: c.partner.name,
      title: c.title,
      type: courseTypeLabel(c.type, c.recurring),
      status: statusLabel(c.status),
      population: populationLabel(c.population),
      visible: c.visibleInCatalogue ? "Oui" : "Non",
      topic1: c.topicPrimary?.name ?? "",
      topic2: c.topicSecondary?.name ?? "",
      topic3: c.topicTertiary?.name ?? "",
      cat1: c.categoryPrimary?.name ?? "",
      cat2: c.categorySecondary?.name ?? "",
      cat3: c.categoryTertiary?.name ?? "",
      badges: c.badges.map((b) => b.name).join(", "),
      sessions: c.sessions.length,
      first: c.sessions[0] ? isoDate(c.sessions[0].date) : "",
    });
  }

  const as = wb.addWorksheet("Affectations ONA");
  as.columns = [
    { header: "Nom de famille", key: "last", width: 20 },
    { header: "Prénom", key: "first", width: 20 },
    { header: "Numéro national", key: "nn", width: 24 },
    { header: "Activités", key: "course", width: 16 },
    { header: "Partenaire", key: "partner", width: 24 },
    { header: "Date d'affectation", key: "date", width: 16 },
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
      // (filename kept in ASCII for browser compatibility)
    },
  });
}
