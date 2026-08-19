# Email Automator

Email Automator sends a predefined email from a web page or a CSV file. It is
built with Next.js, Nodemailer, and React Email.

The CSV script is useful when you want to prepare a list of recipients and send
the emails with one command.

## What the app sends

You provide:

- the main recipient (`to`)
- the recipient's university
- optional CC recipients
- optional BCC recipients

The email subject and message are stored in
[`lib/email/template.tsx`](lib/email/template.tsx). Review that file before you
send a real email.

The approved email is the EduDeca – Whiz360 Science-college introduction and
invitation.
The `university` value replaces the recipient college/school placeholder. Its
default closing is fixed as Sankar Lakshmanan, EduDeca – Whiz360, and Founder.
These closing details are not entered through the browser or CSV.

Each CSV row creates a separate email:

- **To** recipients are the main recipients.
- **CC** recipients receive a visible copy.
- **BCC** recipients receive a hidden copy.

## Requirements

- Node.js 20 or newer
- pnpm
- a Gmail account with 2-Step Verification enabled
- a Gmail App Password

## Install the project

```bash
pnpm install
cp .env.example .env.local
```

Open `.env.local` and add your settings:

```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-16-character-app-password
EMAIL_ADMIN=your-email@gmail.com
EMAIL_AUTOMATOR_USERNAME=admin
EMAIL_AUTOMATOR_PASSWORD=your-strong-browser-password
EMAIL_AUTOMATOR_SESSION_SECRET=your-random-session-secret
```

Important:

- Use a Google App Password, not your normal Gmail password.
- Write the App Password without spaces.
- Never commit or share `.env.local`.
- If an App Password is exposed, revoke it and create a new one.

The three `EMAIL_AUTOMATOR_*` variables protect the browser interface with a
username, password, and signed session cookie. The password must contain at
least 12 characters. Generate the session secret with:

```bash
openssl rand -base64 32
```

The CSV script does not require the browser authentication variables.

## Send your first CSV email

### 1. Create the CSV file

Create `data/send.csv` with this content:

```csv
to,university,cc,bcc
your-email@gmail.com,Test University,,
```

Use your own email address for the first test.

The first row must be exactly:

```csv
to,university,cc,bcc
```

Every data row must contain all four columns. When CC and BCC are empty, keep
the two commas at the end:

```csv
your-email@gmail.com,Test University,,
```

### 2. Run the script

Run this command from the project folder:

```bash
pnpm send send.csv
```

Pass only the filename. The script automatically looks inside `data/`.

Correct:

```bash
pnpm send send.csv
```

Incorrect:

```bash
pnpm send data/send.csv
```

You can also leave out the `.csv` extension:

```bash
pnpm send send
```

The script sends immediately after the file passes validation. Check the
template and recipient addresses before running the command.

### 3. Check the result

A successful run looks similar to this:

```text
Sending template "Email subject" to 1 pending recipients across 1 rows...
Finished: 1 accepted, 0 not accepted.
```

`accepted` means the SMTP server accepted the message. It does not guarantee
that the email reached the inbox, so also check the spam folder.

## CSV examples

### No CC or BCC

```csv
to,university,cc,bcc
student@example.com,ABC University,,
```

### With CC and BCC

```csv
to,university,cc,bcc
student@example.com,ABC University,manager@example.com,audit@example.com
```

### Multiple CC or BCC recipients

Separate multiple addresses with semicolons:

```csv
to,university,cc,bcc
student@example.com,ABC University,"manager@example.com; team@example.com","audit@example.com; archive@example.com"
```

### Multiple emails

Add one row for each email:

```csv
to,university,cc,bcc
first@example.com,ABC University,,
second@example.com,XYZ University,manager@example.com,
third@example.com,RDM University,,audit@example.com
```

## Preventing duplicate emails

After an email is accepted, the script records it in:

```text
data/.email-send-ledger.json
```

Running the same CSV again skips recipients that were already accepted for the
same university and template.

If you intentionally want to send the template again, use:

```bash
pnpm send send.csv --force
```

Use `--force` carefully because it can send duplicate emails.

## Common errors

### CSV files must be selected by name from the data folder

You included `data/` in the command. Use:

```bash
pnpm send send.csv
```

### CSV must include a "to" header

Make sure the first row starts with lowercase `to`:

```csv
to,university,cc,bcc
```

### CSV must include a "university" header

Add the required `university` column using the exact lowercase spelling.

### CSV could not be parsed

The number of values probably does not match the number of headers. If CC and
BCC are empty, end the row with two commas:

```csv
student@example.com,ABC University,,
```

Also check that values containing commas are wrapped in double quotes.

### SMTP environment variables are missing or invalid

Check `.env.local`. Make sure the Gmail address and App Password are correct,
and remove spaces from the App Password.

### No pending recipients

The script has already sent the current template to those recipients. Use
`--force` only if you intentionally want to send it again.

## Send from the browser

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app redirects you to
`/login`. Sign in with `EMAIL_AUTOMATOR_USERNAME` and
`EMAIL_AUTOMATOR_PASSWORD`, then enter the university, To addresses, and
optional CC/BCC addresses. Review the confirmation before sending.

The browser session is stored in a signed, HTTP-only cookie and expires after
eight hours. Use **Log out** when you finish. The login page is rate-limited to
five attempts per username every 15 minutes.

## Limits and safety

- A CSV can contain up to 1,000 rows and can be up to 2 MB.
- Each row can contain up to 10 unique recipients across To, CC, and BCC.
- Invalid CSV data stops the whole batch before any email is sent.
- The script can process up to three CSV rows at the same time.
- Only send email to people who expect to hear from you.
- For marketing email, provide an unsubscribe option and follow applicable
  anti-spam laws.

## Check the project

These commands do not send real emails:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The automated tests use a mock email provider.
