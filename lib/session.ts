import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type Role = "MANAGER" | "PARTNER" | "TRAINER";

export type DemoSession = {
  role: Role;
  partnerId?: number;
  trainerId?: number;
};

export const DEMO_COOKIE = "demo";

export function getSession(): DemoSession | null {
  const raw = cookies().get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoSession;
    if (!parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Require a partner session; returns the Partner row or redirects home. */
export async function requirePartner() {
  const s = getSession();
  if (s?.role !== "PARTNER" || !s.partnerId) redirect("/");
  const partner = await prisma.partner.findUnique({
    where: { id: s.partnerId },
  });
  if (!partner) redirect("/");
  return partner;
}

/** Require a trainer session; returns the Trainer row or redirects home. */
export async function requireTrainer() {
  const s = getSession();
  if (s?.role !== "TRAINER" || !s.trainerId) redirect("/");
  const trainer = await prisma.trainer.findUnique({
    where: { id: s.trainerId },
    include: { partner: true },
  });
  if (!trainer) redirect("/");
  return trainer;
}

export function requireManager() {
  const s = getSession();
  if (s?.role !== "MANAGER") redirect("/");
  return s;
}
