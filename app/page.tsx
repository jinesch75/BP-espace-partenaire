import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  enterAsManager,
  enterAsPartner,
  enterAsTrainer,
} from "@/app/_actions/demo";

export const dynamic = "force-dynamic";

export default async function Home() {
  const partners = await prisma.partner.findMany({
    orderBy: [{ managesTrainees: "desc" }, { name: "asc" }],
    include: {
      trainers: { orderBy: { lastName: "asc" } },
      _count: { select: { courses: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="section-title">Demo access — choose a role</h1>
          <p className="mt-1 text-sm text-slate-500">
            No account needed. Click any role to explore that view.
          </p>
        </div>
        <Link href="/login" className="btn-secondary">
          Log in with an account
        </Link>
      </div>

      {/* Manager */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Manager (you)</h2>
        <p className="mt-1 text-sm text-slate-500">
          See all courses, set population / topics / badges / catalogue
          visibility, and view the trainee database.
        </p>
        <form action={enterAsManager} className="mt-3">
          <button className="btn-primary">Enter as Manager</button>
        </form>
      </section>

      {/* Partners */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Partners</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each partner manages their own courses and trainers. ONA can also
          assign trainees.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => (
            <form key={p.id} action={enterAsPartner}>
              <input type="hidden" name="partnerId" value={p.id} />
              <button className="card flex w-full items-center justify-between p-4 text-left hover:border-brand hover:shadow">
                <span>
                  <span className="block font-medium text-slate-800">
                    {p.name}
                    {p.managesTrainees && (
                      <span className="badge-pill ml-2 bg-amber-100 text-amber-700">
                        ONA
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {p._count.courses} courses · {p.trainers.length} trainers
                  </span>
                </span>
                <span className="text-brand">→</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* Trainers */}
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800">Trainer</h2>
        <p className="mt-1 text-sm text-slate-500">
          A trainer sees the courses they are assigned to and who is registered.
        </p>
        <form action={enterAsTrainer} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px]">
            <label className="label" htmlFor="trainerId">
              Choose a trainer
            </label>
            <select id="trainerId" name="trainerId" className="input" required>
              <option value="">— select —</option>
              {partners.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  {p.trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button className="btn-primary">Enter as Trainer</button>
        </form>
      </section>
    </div>
  );
}
