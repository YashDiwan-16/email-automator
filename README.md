# Courier Email Automator

A small email-sending tool built with Next.js, Nodemailer, and React Email. Send the same approved template from the browser or from a CSV file.

## Email format

Operators provide only:

- The recipient university
- To addresses
- Optional CC and BCC addresses

The subject and message are predefined in [`lib/email/template.tsx`](lib/email/template.tsx). For `XYZ University`, the email includes:

```text
Dear XYZ University,

...

Regards,
Sankar
Principal
RDM University
```

The university must be entered explicitly. The application never guesses it from an email address.

## Setup

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
```

Configure `.env.local`:

```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-gmail-app-password
EMAIL_ADMIN=your-email@gmail.com
EMAIL_AUTOMATOR_ACCESS_TOKEN=your-private-browser-token
```

For Gmail, use an app password instead of your normal account password.

### Browser access token

`EMAIL_AUTOMATOR_ACCESS_TOKEN` protects the website from unauthorized email sending. It is an application token—not your Gmail password.

Generate one:

```bash
openssl rand -base64 32
```

Save the generated value in `.env.local` and share it privately only with authorized operators. The local CSV command does not require this token.

## Send from the browser

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), then enter:

1. The browser access token
2. The exact recipient university
3. To, CC, and BCC addresses

Review the confirmation and send. One browser submission creates one SMTP message. To and CC are visible to recipients; BCC remains hidden.

## Send from CSV

Create a CSV inside the `data` folder. You can start with the example:

```bash
cp data/recipients.csv.example data/recipients.csv
```

CSV format:

```csv
to,university,cc,bcc
recipient@example.com,XYZ University,,
principal@example.com,ABC Institute,manager@example.com,audit@example.com
```

- `to` and `university` are required.
- `cc` and `bcc` are optional.
- Each row sends one university-specific email.
- Separate multiple addresses inside one cell with semicolons.
- Quote a cell if it contains commas.

Run:

```bash
pnpm send recipients.csv
```

The filename is resolved from the `data` folder and may also be passed without `.csv`:

```bash
pnpm send recipients
```

Successful deliveries are checkpointed, so rerunning the command skips recipients already accepted for the same university and template. To deliberately resend everything:

```bash
pnpm send recipients.csv --force
```

## Validation and limits

- Browser: maximum 10 unique recipients per message.
- CSV: maximum 1,000 rows, 2 MB, and 10 unique recipients per row.
- Invalid CSV rows stop the complete batch before any email is sent.
- CSV sends run with up to three rows in parallel.
- SMTP acceptance does not guarantee inbox delivery.
- Send only to people who expect to hear from you.

## Verify the project

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Tests use a mocked provider and do not send real emails.
