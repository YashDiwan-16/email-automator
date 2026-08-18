import { EmailComposer } from "@/components/email-composer";
import { PREDEFINED_EMAIL_TEMPLATE } from "@/lib/email/template";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f7f4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,#e8e8e2_1px,transparent_1px),linear-gradient(to_bottom,#e8e8e2_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-72 h-80 w-80 rounded-full bg-emerald-100/80 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="m5 8 7 5 7-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950">Courier</p>
              <p className="text-xs text-slate-500">Secure email dispatch</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
            Protected workspace
          </div>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <div>
            <div className="mb-8 max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                <svg aria-hidden="true" className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24">
                  <path d="M12 3 4.5 6v5.5c0 4.5 3.2 7.6 7.5 9.5 4.3-1.9 7.5-5 7.5-9.5V6L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
                  <path d="m9 12 2 2 4-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
                Authorized sending only
              </div>
              <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl">
                One approved template,
                <span className="text-violet-600"> delivered reliably.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Add To, CC, and BCC recipients, then send the predefined message
                through your configured SMTP service.
              </p>
            </div>
            <EmailComposer templateSubject={PREDEFINED_EMAIL_TEMPLATE.subject} />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-8 lg:pt-40">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Delivery guardrails</p>
              <ul className="mt-4 space-y-4 text-sm text-slate-600">
                {[
                  "Up to 10 unique recipients",
                  "To and CC visibility is explicit",
                  "BCC addresses remain hidden",
                  "Conservative retry protection",
                  "Server-side validation and rate limits",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                        <path d="m2.5 6 2.2 2.2L9.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M12 8v5m0 3h.01M10.3 4.8 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-semibold text-amber-950">Send responsibly</p>
              <p className="mt-1 text-xs leading-5 text-amber-900/70">
                Only contact people who expect to hear from you. This tool is
                designed for small, consent-based sends.
              </p>
            </div>
          </aside>
        </div>

        <footer className="py-10 text-center text-xs text-slate-400">
          SMTP delivery powered by Nodemailer
        </footer>
      </div>
    </main>
  );
}
