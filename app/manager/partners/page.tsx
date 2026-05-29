import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/session";
import { updatePartner, deletePartner } from "@/app/manager/_actions";

export const dynamic = "force-dynamic";

export default async function ManagerPartners() {
  requireManager();
  const partners = await prisma.partner.findMany({
    orderBy: [{ managesTrainees: "desc" }, { name: "asc" }],
    include: { _count: { select: { courses: true, trainers: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Partners</h1>
        <p className="text-sm text-slate-500">
          Edit each partner&apos;s general information, or delete a partner. The
          contact details appear at the top of that partner&apos;s own page.
        </p>
      </div>

      <div className="space-y-4">
        {partners.map((p) => (
          <div key={p.id} className="card p-5">
            <form action={updatePartner} className="space-y-4">
              <input type="hidden" name="partnerId" value={p.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">{p.name}</h2>
                  {p.managesTrainees && (
                    <span className="badge-pill bg-amber-100 text-amber-700">ONA</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {p._count.courses} courses · {p._count.trainers} trainers
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Partner name</label>
                  <input name="name" className="input" defaultValue={p.name} />
                </div>
                <div>
                  <label className="label">Contact email</label>
                  <input
                    name="contactEmail"
                    type="email"
                    className="input"
                    defaultValue={p.contactEmail ?? ""}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input name="phone" className="input" defaultValue={p.phone ?? ""} />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input name="address" className="input" defaultValue={p.address ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    defaultValue={p.description ?? ""}
                  />
                </div>
              </div>

              <button className="btn-primary">Save changes</button>
            </form>

            <form
              action={deletePartner}
              className="mt-4 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="partnerId" value={p.id} />
              <button className="btn-danger">Delete this partner</button>
              <span className="ml-2 text-xs text-slate-400">
                Also deletes this partner&apos;s courses, sessions and trainers.
              </span>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
