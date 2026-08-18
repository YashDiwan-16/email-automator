import { z } from "zod";

export const MAX_RECIPIENTS = 10;

function normalizeDomain(domain: string): string {
  const lowerCasedDomain = domain.toLocaleLowerCase("en-US");

  try {
    const parsed = new URL(`http://${lowerCasedDomain}`);
    const isBareHostname =
      parsed.pathname === "/" &&
      parsed.search === "" &&
      parsed.hash === "" &&
      parsed.port === "" &&
      parsed.username === "" &&
      parsed.password === "";

    return isBareHostname ? parsed.hostname : lowerCasedDomain;
  } catch {
    return lowerCasedDomain;
  }
}

export function normalizeEmailAddress(value: string): string {
  const trimmed = value.trim().normalize("NFKC");
  const separatorIndex = trimmed.lastIndexOf("@");

  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
    return trimmed;
  }

  const localPart = trimmed.slice(0, separatorIndex);
  const domain = trimmed.slice(separatorIndex + 1);

  return `${localPart}@${normalizeDomain(domain)}`;
}

const normalizedEmailSchema = z
  .string()
  .transform(normalizeEmailAddress)
  .pipe(z.email({ error: "Enter a valid email address." }));

export interface ParsedRecipientList {
  recipients: string[];
  invalidRecipients: string[];
}

export function parseRecipientList(value: string): ParsedRecipientList {
  const recipients: string[] = [];
  const invalidRecipients: string[] = [];
  const seen = new Set<string>();

  for (const candidate of value.split(/[,\n]/u)) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = normalizedEmailSchema.safeParse(trimmed);
    if (!parsed.success) {
      invalidRecipients.push(trimmed);
      continue;
    }

    const deduplicationKey = parsed.data.toLocaleLowerCase("en-US");
    if (!seen.has(deduplicationKey)) {
      seen.add(deduplicationKey);
      recipients.push(parsed.data);
    }
  }

  return { recipients, invalidRecipients };
}

const recipientListSchema = z
  .string()
  .max(5_000, { error: "The recipient list is too long." })
  .transform((value, context) => {
    const parsed = parseRecipientList(value);

    if (parsed.recipients.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Enter at least one valid recipient.",
      });
    }

    for (const invalidRecipient of parsed.invalidRecipients) {
      context.addIssue({
        code: "custom",
        message: `Invalid email address: ${invalidRecipient}`,
      });
    }

    if (parsed.recipients.length > MAX_RECIPIENTS) {
      context.addIssue({
        code: "custom",
        message: `Send to no more than ${MAX_RECIPIENTS} recipients at once.`,
      });
    }

    return parsed.recipients;
  });

export const emailComposerSchema = z.object({
  accessToken: z
    .string()
    .min(16, { error: "Enter your access token." })
    .max(256, { error: "The access token is too long." }),
  fromName: z
    .string()
    .trim()
    .min(1, { error: "Enter a sender name." })
    .max(100, { error: "Use 100 characters or fewer." })
    .regex(/^[^<>\r\n]+$/u, { error: "Use a valid sender name." }),
  replyTo: normalizedEmailSchema,
  recipients: recipientListSchema,
  subject: z
    .string()
    .trim()
    .min(1, { error: "Enter a subject." })
    .max(200, { error: "Use 200 characters or fewer." })
    .regex(/^[^\r\n]+$/u, { error: "The subject must be a single line." }),
  message: z
    .string()
    .trim()
    .min(1, { error: "Enter a message." })
    .max(10_000, { error: "Use 10,000 characters or fewer." }),
  idempotencyKey: z.uuid({ error: "Start a new send and try again." }),
});

export type EmailComposerInput = z.input<typeof emailComposerSchema>;
export type ValidatedEmailComposerInput = z.output<typeof emailComposerSchema>;
export type EmailComposerField = keyof EmailComposerInput;
