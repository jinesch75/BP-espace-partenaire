"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "@/lib/session";

function setDemo(value: object) {
  cookies().set(DEMO_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function enterAsManager() {
  setDemo({ role: "MANAGER" });
  redirect("/manager");
}

export async function enterAsPartner(formData: FormData) {
  const partnerId = Number(formData.get("partnerId"));
  if (!partnerId) redirect("/");
  setDemo({ role: "PARTNER", partnerId });
  redirect("/partner");
}

export async function enterAsTrainer(formData: FormData) {
  const trainerId = Number(formData.get("trainerId"));
  if (!trainerId) redirect("/");
  setDemo({ role: "TRAINER", trainerId });
  redirect("/trainer");
}

export async function exitDemo() {
  cookies().delete(DEMO_COOKIE);
  redirect("/");
}
