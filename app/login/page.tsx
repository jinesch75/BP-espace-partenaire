import Link from "next/link";
import { login } from "@/app/_actions/auth";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="section-title">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connectez-vous avec votre compte. Vous testez ?{" "}
          <Link href="/" className="font-semibold text-brand hover:underline">
            Utiliser l&apos;accès démo
          </Link>
          .
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          E-mail ou mot de passe incorrect.
        </div>
      )}

      <form action={login} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            required
          />
        </div>
        <button className="btn-primary w-full">Se connecter</button>
      </form>
    </div>
  );
}
