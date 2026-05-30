// Idempotent seed: loads the fictional test data from seed-data.json.
// Safe to run more than once — it skips if partners already exist.
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf-8"));

// --- crypto helpers (must match lib/crypto.ts) ---
const DEV_KEY_SOURCE = "espace-partenaire-dev-key-change-me";
function encKey() {
  const env = process.env.ENCRYPTION_KEY;
  const source = env && env.length >= 16 ? env : DEV_KEY_SOURCE;
  return crypto.createHash("sha256").update(source).digest();
}
function encryptSensitive(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "enc:" + Buffer.concat([iv, tag, enc]).toString("base64");
}
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const DEMO_PASSWORD = "biergerpakt";

async function resetSequences() {
  const tables = [
    "Partner",
    "Trainer",
    "Course",
    "Session",
    "Topic",
    "Badge",
    "Trainee",
    "TraineeAssignment",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"','id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1))`
    );
  }
}

// Canonical themes (8) and badges (8). Applied on every run so the live
// database always reflects the latest names.
const TOPICS = [
  "Ateliers créatifs et de rencontre",
  "Cafés des langues",
  "Formations et conférences",
  "Podcasts",
  "Sessions d'information en ligne",
  "Soirées cinématiques",
  "Visites guidées",
  "Autres",
];
const BADGES = [
  "Démocratie",
  "Linguistique",
  "Culturel",
  "Patrimoine",
  "Anti-racisme",
  "Social",
  "Echange culturel",
  "Administratif",
];

async function applyTaxonomy() {
  for (let i = 0; i < TOPICS.length; i++) {
    await prisma.topic.upsert({
      where: { id: i + 1 },
      update: { name: TOPICS[i] },
      create: { id: i + 1, name: TOPICS[i] },
    });
  }
  for (let i = 0; i < BADGES.length; i++) {
    await prisma.badge.upsert({
      where: { id: i + 1 },
      update: { name: BADGES[i] },
      create: { id: i + 1, name: BADGES[i] },
    });
  }
}

// Catalogue rule (applied on every run, even when the seed is skipped):
// ONA courses belong to the DPI catalogue (POP2),
// ASTI courses to the main catalogue (POP1).
async function applyCatalogueRules() {
  const ona = await prisma.partner.findFirst({ where: { name: "ONA" } });
  if (ona) {
    await prisma.course.updateMany({
      where: { partnerId: ona.id },
      data: { population: "POP2" },
    });
  }
  const asti = await prisma.partner.findFirst({ where: { name: "ASTI" } });
  if (asti) {
    await prisma.course.updateMany({
      where: { partnerId: asti.id },
      data: { population: "POP1" },
    });
  }
}

async function main() {
  // always enforce theme/badge names and the catalogue rule,
  // even on an already-seeded database
  await applyTaxonomy();
  await applyCatalogueRules();

  const existing = await prisma.partner.count();
  if (existing > 0) {
    console.log(`Seed skipped — ${existing} partners already present.`);
    return;
  }

  // Manager account
  await prisma.manager.create({
    data: {
      email: "manager@espace.lu",
      name: "Training center manager",
      passwordHash: hashPassword(DEMO_PASSWORD),
    },
  });

  // Topics & badges are created/updated by applyTaxonomy() above.

  let partnerId = 0;
  for (const p of data.partners) {
    partnerId += 1;
    await prisma.partner.create({
      data: {
        id: partnerId,
        name: p.name,
        managesTrainees: !!p.manages_trainees,
        description: `${p.name} est un partenaire de formation proposant des cours dans le cadre du programme Biergerpakt.`,
        contactEmail: `contact@${slug(p.name)}.lu`,
        phone: `+352 27 ${100000 + partnerId * 137}`.slice(0, 16),
        address: `${partnerId} Rue de la Formation, Luxembourg`,
        email: `${slug(p.name)}@espace.lu`,
        passwordHash: hashPassword(DEMO_PASSWORD),
      },
    });

    await prisma.trainer.createMany({
      data: p.trainers.map((t) => ({
        id: t.id,
        partnerId,
        firstName: t.first_name,
        lastName: t.last_name,
        email: `${slug(t.first_name)}.${slug(t.last_name)}${t.id}@espace.lu`,
        passwordHash: hashPassword(DEMO_PASSWORD),
      })),
    });

    for (const c of p.courses) {
      await prisma.course.create({
        data: {
          id: c.id,
          partnerId,
          title: c.title,
          description: c.description ?? null,
          type: c.type === "MULTI" ? "MULTI" : "SINGLE",
          status: c.status ?? "DRAFT",
          recurring: !!c.recurring,
          population: c.population ?? null,
          visibleInCatalogue: !!c.visible_in_catalogue,
          topics: { connect: (c.topic_ids ?? []).map((id) => ({ id })) },
          badges: { connect: (c.badge_ids ?? []).map((id) => ({ id })) },
          sessions: {
            create: c.sessions.map((s) => ({
              id: s.id,
              sequence: s.sequence,
              date: new Date(s.date),
              startTime: s.start_time,
              endTime: s.end_time,
              isOnline: !!s.is_online,
              location: s.location ?? null,
              teamsLink: s.teams_link ?? null,
              placesAvailable: s.places_available ?? 0,
              trainerId: s.trainer_id ?? null,
            })),
          },
        },
      });
    }
  }

  await prisma.trainee.createMany({
    data: data.trainees.map((t) => ({
      id: t.id,
      lastName: t.last_name,
      firstName: t.first_name,
      nationalNumber: encryptSensitive(t.national_number),
    })),
  });

  for (const a of data.trainee_assignments ?? []) {
    await prisma.traineeAssignment.create({
      data: {
        traineeId: a.trainee_id,
        courseId: a.course_id,
        assignedDate: new Date(a.assigned_date),
      },
    });
  }

  await resetSequences();
  await applyCatalogueRules();

  const counts = {
    partners: await prisma.partner.count(),
    trainers: await prisma.trainer.count(),
    courses: await prisma.course.count(),
    sessions: await prisma.session.count(),
    trainees: await prisma.trainee.count(),
    assignments: await prisma.traineeAssignment.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
