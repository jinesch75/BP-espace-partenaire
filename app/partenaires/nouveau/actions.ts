"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Public demo creation of a partner from the landing page (no auth).
export async function createPartnerPublic(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/partenaires/nouveau?error=name");

  await prisma.partner.create({
    data: {
      name,
      managesTrainees: formData.get("managesTrainees") === "on",
      description: String(formData.get("description") ?? "").trim() || null,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    },
  });

  revalidatePath("/");
  redirect("/");
}
