import { redirect } from "next/navigation";

import { login } from "@/app/actions/auth";
import { readAuthenticatedSession } from "@/lib/session";

interface LoginPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

const loginErrors: Record<string, string> = {
  configuration:
    "Browser login is not configured. Add the authentication variables to your environment.",
  invalid_credentials: "The username or password is incorrect.",
  rate_limited: "Too many login attempts. Wait 15 minutes and try again.",
};

function resolveLoginError(error: string | string[] | undefined): string | null {
  const code = Array.isArray(error) ? error[0] : error;
  return code ? (loginErrors[code] ?? null) : null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await readAuthenticatedSession();
  if (session) {
    redirect("/");
  }

  const error = resolveLoginError((await searchParams).error);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f4] px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,#e8e8e2_1px,transparent_1px),linear-gradient(to_bottom,#e8e8e2_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet-200/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-emerald-100/80 blur-3xl"
      />

      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_30px_100px_-35px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="border-b border-slate-100 px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="m5 8 7 5 7-5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            Protected workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            Sign in to Courier
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use the private credentials configured by your administrator to
            access email dispatch.
          </p>
        </div>

        <form action={login} className="space-y-5 px-6 py-7 sm:px-8 sm:py-8">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="username"
              className="text-sm font-semibold text-slate-900"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              maxLength={100}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-900"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(124,58,237,0.85)] transition hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            Sign in securely
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d="M4 10h12m-4-4 4 4-4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          </button>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-400">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 16 16"
            >
              <rect
                x="3"
                y="7"
                width="10"
                height="7"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
            Secure, HTTP-only session
          </div>
        </form>
      </section>
    </main>
  );
}
