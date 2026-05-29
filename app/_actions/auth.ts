"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { DEMO_COOKIE } from "@/lib/session";
import { logAuditExplicit } from "@/lib/audit";

function setSession(value: object) {
  cookies().set(DEMO_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=1");

  const manager = await prisma.manager.findUnique({ where: { email } });
  if (manager && verifyPassword(password, manager.passwordHash)) {
    setSession({ role: "MANAGER" });
    await logAuditExplicit("MANAGER", manager.email, "LOGIN", "Manager", manager.id);
    redirect("/manager");
  }

  const partner = await prisma.partner.findFirst({ where: { email } });
  if (partner && verifyPassword(password, partner.passwordHash)) {
    setSession({ role: "PARTNER", partnerId: partner.id });
    await logAuditExplicit("PARTNER", partner.name, "LOGIN", "Partner", partner.id);
    redirect("/partner");
  }

  const trainer = await prisma.trainer.findFirst({ where: { email } });
  if (trainer && verifyPassword(password, trainer.passwordHash)) {
    setSession({ role: "TRAINER", trainerId: trainer.id });
    await logAuditExplicit(
      "TRAINER",
      `${trainer.firstName} ${trainer.lastName}`,
      "LOGIN",
      "Trainer",
      trainer.id
    );
    redirect("/trainer");
  }

  redirect("/login?error=1");
}

export async function logout() {
  cookies().delete(DEMO_COOKIE);
  redirect("/login");
}
