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

export interface ParsedAddressList {
  addresses: string[];
  invalidAddresses: string[];
}

export function parseAddressList(value: string): ParsedAddressList {
  const addresses: string[] = [];
  const invalidAddresses: string[] = [];
  const seen = new Set<string>();

  for (const candidate of value.split(/[,;\r\n]/u)) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = normalizedEmailSchema.safeParse(trimmed);
    if (!parsed.success) {
      invalidAddresses.push(trimmed);
      continue;
    }

    const deduplicationKey = parsed.data.toLocaleLowerCase("en-US");
    if (!seen.has(deduplicationKey)) {
      seen.add(deduplicationKey);
      addresses.push(parsed.data);
    }
  }

  return { addresses, invalidAddresses };
}

type AddressField = "to" | "cc" | "bcc";

const rawAddressGroupsSchema = z.object({
  to: z.string().max(5_000, { error: "The To list is too long." }),
  cc: z.string().max(5_000, { error: "The CC list is too long." }),
  bcc: z.string().max(5_000, { error: "The BCC list is too long." }),
});

function deduplicateAddressGroups(
  groups: Record<AddressField, string[]>,
): Record<AddressField, string[]> {
  const seen = new Set<string>();

  return Object.fromEntries(
    (["to", "cc", "bcc"] as const).map((field) => [
      field,
      groups[field].filter((address) => {
        const key = address.toLocaleLowerCase("en-US");
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      }),
    ]),
  ) as Record<AddressField, string[]>;
}

export const emailAddressGroupsSchema = rawAddressGroupsSchema.transform(
  (input, context) => {
    const parsedGroups = {
      to: parseAddressList(input.to),
      cc: parseAddressList(input.cc),
      bcc: parseAddressList(input.bcc),
    };

    for (const field of ["to", "cc", "bcc"] as const) {
      for (const invalidAddress of parsedGroups[field].invalidAddresses) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `Invalid email address: ${invalidAddress}`,
        });
      }

      if (field === "to" && parsedGroups.to.addresses.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["to"],
          message: "Enter at least one valid To address.",
        });
      }
    }

    const groups = deduplicateAddressGroups({
      to: parsedGroups.to.addresses,
      cc: parsedGroups.cc.addresses,
      bcc: parsedGroups.bcc.addresses,
    });
    const recipientCount = groups.to.length + groups.cc.length + groups.bcc.length;

    if (recipientCount > MAX_RECIPIENTS) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: `Send to no more than ${MAX_RECIPIENTS} unique recipients at once.`,
      });
    }

    return groups;
  },
);

const rawEmailComposerSchema = rawAddressGroupsSchema.extend({
  accessToken: z
    .string()
    .min(16, { error: "Enter your access token." })
    .max(256, { error: "The access token is too long." }),
  idempotencyKey: z.uuid({ error: "Start a new send and try again." }),
});

export const emailComposerSchema = rawEmailComposerSchema.transform(
  (input, context) => {
    const addressGroups = emailAddressGroupsSchema.safeParse(input);

    if (!addressGroups.success) {
      for (const issue of addressGroups.error.issues) {
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
      }
    }

    return {
      accessToken: input.accessToken,
      ...(addressGroups.success
        ? addressGroups.data
        : { to: [], cc: [], bcc: [] }),
      idempotencyKey: input.idempotencyKey,
    };
  },
);

export type EmailComposerInput = z.input<typeof emailComposerSchema>;
export type ValidatedEmailComposerInput = z.output<typeof emailComposerSchema>;
export type EmailComposerField = keyof EmailComposerInput;
