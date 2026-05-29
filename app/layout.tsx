import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Urbanist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exitDemo } from "@/app/_actions/demo";

const heading = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Urbanist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Espace partenaire · Biergerpakt",
  description: "Training course management — partner space",
};

async function TopBar() {
  const session = getSession();
  if (!session) return null;

  let label = "Manager";
  let links: { href: string; text: string }[] = [];

  if (session.role === "MANAGER") {
    label = "Manager";
    links = [
      { href: "/manager", text: "Dashboard" },
      { href: "/manager/partners", text: "Partners" },
      { href: "/manager/courses", text: "All courses" },
      { href: "/manager/trainees", text: "Trainees" },
    ];
  } else if (session.role === "PARTNER" && session.partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: session.partnerId },
    });
    label = `Partner · ${partner?.name ?? "?"}`;
    links = [
      { href: "/partner", text: "My courses" },
      { href: "/partner/trainers", text: "Trainers" },
    ];
    if (partner?.managesTrainees) {
      links.push({ href: "/partner/assign", text: "Assign trainees" });
    }
  } else if (session.role === "TRAINER" && session.trainerId) {
    const trainer = await prisma.trainer.findUnique({
      where: { id: session.trainerId },
    });
    label = `Trainer · ${trainer?.firstName ?? ""} ${trainer?.lastName ?? ""}`;
    links = [{ href: "/trainer", text: "My courses" }];
  }

  return (
    <header className="border-t-4 border-brand bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-xl font-bold tracking-tight text-ink">
            Espace partenaire
          </span>
          <span className="h-2 w-2 rounded-full bg-brand" />
        </Link>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-brand-light hover:text-brand"
            >
              {l.text}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="badge-pill bg-brand-light text-brand">{label}</span>
          <form action={exitDemo}>
            <button className="text-sm font-medium text-slate-500 hover:text-brand">
              Switch role
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body>
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500">
            <span className="font-heading font-bold text-ink">
              Espace partenaire
            </span>
            <span>Training course management · Biergerpakt</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
