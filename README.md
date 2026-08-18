# Courier

Courier is an authorized email-dispatch app built with Next.js 16 and Nodemailer. The browser and CSV command both send the same predefined code-managed template through a configured SMTP account.

## What it does

- The browser accepts only an access token and To, CC, and BCC addresses.
- Sender identity, reply-to, subject, plain text, and HTML are controlled by server configuration and code.
- One browser submission creates one SMTP message: To and CC are visible, while BCC is hidden.
- `pnpm send <file.csv>` sends CSV rows with the same template and address semantics.
- Addresses are normalized, deduplicated in To → CC → BCC order, validated, and capped before sending.

## Architecture

- `app/page.tsx` renders the Server Component page shell.
- `components/email-composer.tsx` is the React Hook Form client boundary.
- `app/actions/send-email.ts` is the protected same-origin Server Action.
- `lib/email/workflow.ts` authenticates, validates, rate-limits, and idempotently dispatches browser submissions.
- `lib/email/service.ts` renders the predefined React Email template and implements conservative SMTP retry behavior.
- `lib/email/nodemailer-provider.ts` adapts Nodemailer results and SMTP errors to the application delivery model.
- `lib/email/csv-email-source.ts` parses and validates CSV rows.
- `lib/email/csv-email-batch.ts` sends validated rows with bounded concurrency.
- `lib/email/csv-delivery-ledger.ts` checkpoints accepted CSV recipients as non-identifying hashes for safe resume.
- `scripts/send-emails.ts` is the `pnpm send` command entry point.
- `lib/email/template.tsx` contains the predefined React Email body, plain-text alternative, subject, and template version.

Nodemailer credentials are read only by the Server Action or local command. They are never exposed to browser code.

## Requirements

- Node.js 20 or newer
- pnpm 10.6.2
- An SMTP account, such as Gmail SMTP with an app password

## Install and configure

```bash
pnpm install
cp .env.example .env.local
openssl rand -base64 32
```

Replace the placeholders in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `EMAIL_SERVER_HOST` | SMTP hostname, such as `smtp.gmail.com` |
| `EMAIL_SERVER_PORT` | SMTP port; `465` enables implicit TLS, while other ports require STARTTLS |
| `EMAIL_SERVER_USER` | SMTP username, normally the Gmail address |
| `EMAIL_SERVER_PASSWORD` | SMTP password or Gmail app password |
| `EMAIL_ADMIN` | Fixed From and Reply-To email address; displayed as `Email Admin` |
| `EMAIL_AUTOMATOR_ACCESS_TOKEN` | Random 32–256 character secret required by browser sends |

Port `465` uses an implicit TLS connection. Other ports use SMTP with a required STARTTLS upgrade; the app will not silently continue over plaintext.

Gmail can be convenient for local testing with OAuth2 or an app password, but use a transactional SMTP provider for production automation. Keep all credentials in the deployment platform’s encrypted environment store and never prefix them with `NEXT_PUBLIC_`.

## Edit the predefined template

Edit `lib/email/template.tsx`. Update its `version` whenever subject or body content changes; browser fingerprints and CSV resume keys include that version.

The form intentionally does not accept a subject or message body. This prevents operators from bypassing the approved template.

## Browser workflow

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), enter `EMAIL_AUTOMATOR_ACCESS_TOKEN`, add To/CC/BCC addresses, review the visibility confirmation, and send.

- To and CC recipients can see all To and CC headers.
- BCC recipients receive the message without their addresses appearing in the visible headers.
- The combined browser limit is 10 unique recipients per submission.

## CSV workflow

Create a local CSV from the tracked example:

```bash
cp data/recipients.csv.example data/recipients.csv
pnpm send recipients.csv
```

The filename may also be passed without `.csv`:

```bash
pnpm send recipients
```

Successful recipients are checkpointed in `data/.email-send-ledger.json`. Re-running the same command resumes only recipients that were not previously accepted. To deliberately resend the current template to every CSV recipient:

```bash
pnpm send recipients.csv --force
```

CSV format:

```csv
to,cc,bcc
customer@example.com,,
primary@example.com,manager@example.com,audit@example.com
"first@example.com; second@example.com",visible@example.com,"hidden-one@example.com; hidden-two@example.com"
```

Rules:

- `to` is required; `cc` and `bcc` columns are optional.
- Each row creates one SMTP message.
- Put multiple addresses in a cell using semicolons or new lines. If using commas inside a cell, quote the cell as valid CSV.
- Put one address per row in `to` when recipients must not see one another.
- Every row is validated before delivery. If any row is invalid, the command reports row-level errors and sends nothing.
- CSV files must be inside `data/`; path traversal and non-CSV input are rejected.
- `data/*.csv` is ignored by Git, while `data/*.csv.example` remains tracked.
- The ignored delivery ledger contains only SHA-256 keys, not email addresses, and is updated atomically after each completed row.
- The command uses SMTP credentials directly and does not require the browser access token.

The command exits non-zero when validation fails or any recipient is not accepted. An SMTP acceptance response is not proof of inbox delivery.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests mock the provider and never contact a real SMTP server. They cover address grouping and deduplication, Nodemailer result/error mapping, predefined-template delivery, recipient-safe retries, CSV parsing, concurrency and resume, authorization, rate limiting, partial failures, and idempotent browser replay.

## Security and delivery behavior

- Every Server Action call performs a timing-safe access-token check before returning validation detail.
- Next.js Server Actions are POST-only and same-origin protected; the action body is capped at 32 KB.
- The server treats form input as untrusted and validates it again with Zod.
- Sender headers and email content are not accepted from the browser or CSV.
- The browser permits five unique submissions per authorized identity per 10-minute process-local window.
- Successful browser results are cached by submission fingerprint for 15 minutes to reduce accidental duplicates.
- Explicit SMTP 4xx failures are retried up to three total attempts with exponential backoff. After partial acceptance, only temporarily rejected envelope recipients are retried; accepted recipients are not retransmitted.
- Permanent SMTP rejection is not retried. Ambiguous transport failures are also not automatically retried because the server may already have accepted the message.
- Provider diagnostics, credentials, and message bodies are not returned to the browser.

## Current limits and production notes

- Browser: 10 unique recipients per message.
- CSV: 1,000 rows, 2 MB per file, and 10 unique recipients per row.
- CSV delivery: up to three rows in flight.
- Browser rate-limit and idempotency state are process-local and reset on restart. Replace them with atomic shared storage before multi-instance deployment.
- CSV resume uses a local hashed ledger, and `--force` deliberately bypasses prior acceptance. Nodemailer/SMTP still has no universal provider idempotency key, so a machine crash after SMTP acceptance but before the row checkpoint can cause a duplicate. Use a provider-backed durable job ledger for larger campaigns.
- SMTP acceptance is not delivery. Production systems should process provider bounce and complaint events, maintain suppression lists, and monitor reputation.
- Use this only for expected, consent-based email. Bulk or marketing messages may require unsubscribe handling, consent records, sender identification, and jurisdiction-specific compliance controls.
