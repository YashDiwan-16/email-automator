# Courier

Courier is a small, authorized email-dispatch application built with Next.js 16. An operator can compose one message for up to 10 recipients; the server validates the request and sends a separate Resend email to every address so recipients are never exposed to each other.

## Architecture

- `app/page.tsx` is a Server Component that renders the static page shell.
- `components/email-composer.tsx` is the interactive React Hook Form client boundary. It uses the same Zod schema as the server for immediate feedback.
- `app/actions/send-email.ts` is a same-origin Next.js Server Action. It loads server-only configuration and invokes the protected workflow.
- `lib/email/workflow.ts` authenticates, revalidates, rate-limits, and idempotently dispatches a submission.
- `lib/email/service.ts` renders one safe React Email HTML body, retains a plain-text body, and sends separate messages with bounded concurrency and safe retries.
- `lib/email/provider.ts` is the provider-neutral interface; `lib/email/resend-provider.ts` is the Resend adapter.
- `lib/rate-limit.ts` and `lib/idempotency.ts` provide small in-memory MVP controls. See [Production limitations](#production-limitations) before scaling horizontally.

The Resend API key and verified sender address are only read inside server-only modules. Email is never sent from client-side code.

## Requirements

- Node.js 20 or newer
- pnpm 10.6.2 (declared in `package.json`)
- A Resend account, API key, and verified sending domain

## Installation

```bash
pnpm install
cp .env.example .env.local
```

Generate a strong access token, for example:

```bash
openssl rand -base64 32
```

Then replace every placeholder in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only Resend API key beginning with `re_` |
| `RESEND_FROM_EMAIL` | Verified sender address on your Resend domain |
| `EMAIL_AUTOMATOR_ACCESS_TOKEN` | Random secret of 32–256 characters entered by authorized operators |

`.env.local` is ignored by Git. `.env.example` contains placeholders only and is intentionally tracked.

## Resend sender setup

1. Add a domain in the Resend dashboard.
2. Publish the DNS records Resend provides and wait until the domain is verified.
3. Create a sending API key with only the permissions this application needs.
4. Set `RESEND_FROM_EMAIL` to an address on that verified domain, such as `notifications@example.com`.
5. Keep the API key in the deployment platform’s encrypted environment-variable store. Never prefix it with `NEXT_PUBLIC_`.

The operator controls the friendly “From” display name and reply-to address. The underlying sender email remains fixed on the server.

## Local development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Enter the value of `EMAIL_AUTOMATOR_ACCESS_TOKEN` in the access-token field when sending. Tests mock the provider and never call Resend.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The test suite covers recipient splitting, normalization, internationalized-domain conversion, case-insensitive deduplication, invalid addresses, submission limits, provider error handling, bounded concurrency, safe retries, authorization, rate limiting, partial failures, and idempotent replay.

## Security and anti-abuse design

- Every Server Action invocation performs a timing-safe access-token check before returning validation details.
- Next.js Server Actions are POST-only and enforce same-origin `Origin`/`Host` checks. The action body is additionally capped at 32 KB.
- The same Zod schema validates client input and untrusted server input. Sender names and subjects reject header control characters.
- The Resend API key, verified sender, and expected access token are server-only environment variables.
- React Email escapes operator content in the HTML body; the original message is also supplied as the plain-text alternative.
- Recipients are normalized, deduplicated, capped, and delivered separately without CC or BCC.
- Each authorized identity is limited to five unique submissions per 10-minute window.
- Submission results are idempotent for 15 minutes, and every recipient receives a stable provider idempotency key for safe network retries.
- At most three provider calls run concurrently. Only temporary errors are retried, for no more than three total attempts with exponential backoff.
- Provider diagnostics and message bodies are not logged or returned to the browser.

For a larger organization, replace the shared access token with the existing identity provider, short-lived sessions, MFA, role-based authorization, and an audit trail. Rotate both the Resend API key and access token regularly. Monitor send rates, provider bounces, complaints, and suspicious authorization failures.

## Current sending limits

- 10 unique recipients per submission
- 5 unique submissions per authorized identity per 10 minutes
- 10,000 characters per message
- 200 characters per subject
- 3 concurrent provider requests
- 3 total attempts for temporary provider failures
- 15-minute idempotency window with up to 500 recent in-process entries

These conservative limits keep the complete send within a normal web request. Do not increase recipient volume substantially inside the request. For larger sends, use a durable queue, background workers, shared rate limiting, persistent per-recipient state, and webhook-driven delivery updates.

## Deployment

Deploy as a Node.js Next.js application and configure all three required environment variables in the production environment. Use HTTPS, restrict deployment access where possible, and configure only trusted proxy origins if a reverse proxy changes the request host. Self-hosted multi-instance deployments should also provide a consistent `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` as described by the Next.js deployment guide.

The built-in rate limit is production-supported only in a single long-lived Node.js instance. Do not deploy this version across multiple instances or a scale-to-zero serverless topology when enforcement of the stated limit is required. First replace the limiter and idempotency store with atomic, durable shared adapters.

Run all verification commands in CI before deployment. A real send should be tested first with a verified internal recipient and a non-production Resend key or domain.

### Production limitations

The MVP rate limiter and submission-result cache are process-local. They reset on restart and are not shared across serverless instances. Resend’s per-recipient idempotency keys still protect provider retries, but a multi-instance production deployment should move rate-limit counters and submission fingerprints to a durable shared store such as Redis.

The app reports whether Resend accepted each message; acceptance is not proof of inbox delivery. Production systems should process Resend webhooks for delivered, bounced, and complained events and maintain suppression lists.

This tool is intended for small, expected, consent-based communication. Production bulk or marketing email additionally requires documented recipient consent, unsubscribe handling, suppression lists, bounce and complaint processing, appropriate sender identification, and compliance with all applicable anti-spam and privacy laws. Consult qualified counsel for the jurisdictions where recipients reside.
