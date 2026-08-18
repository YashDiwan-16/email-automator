import { z } from "zod";

export const MAX_RECIPIENTS = 10;

export const universityNameSchema = z
  .string()
  .transform((value) => value.trim().normalize("NFKC"))
  .pipe(
    z
      .string()
      .min(1, { error: "Enter the recipient university." })
      .max(150, { error: "Use 150 characters or fewer." })
      .regex(/^[^<>\r\n]*$/u, { error: "Enter a valid university name." }),
  );

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

export type AddressField = "to" | "cc" | "bcc";

export interface AddressGroups {
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface RawAddressGroups {
  to: string;
  cc: string;
  bcc: string;
}

const rawAddressGroupsSchema = z.object({
  to: z.string().max(5_000, { error: "The To list is too long." }),
  cc: z.string().max(5_000, { error: "The CC list is too long." }),
  bcc: z.string().max(5_000, { error: "The BCC list is too long." }),
});

export function normalizeAddressGroups(groups: AddressGroups): AddressGroups {
  const seen = new Set<string>();
  const normalized: AddressGroups = { to: [], cc: [], bcc: [] };

  for (const field of ["to", "cc", "bcc"] as const) {
    normalized[field] = groups[field].filter((address) => {
      const key = address.toLocaleLowerCase("en-US");
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  return normalized;
}

interface AddressGroupIssue {
  field: AddressField;
  message: string;
}

function resolveAddressGroups(input: RawAddressGroups): {
  groups: AddressGroups;
  issues: AddressGroupIssue[];
} {
  const parsedGroups = {
    to: parseAddressList(input.to),
    cc: parseAddressList(input.cc),
    bcc: parseAddressList(input.bcc),
  };
  const issues: AddressGroupIssue[] = [];

  for (const field of ["to", "cc", "bcc"] as const) {
    for (const invalidAddress of parsedGroups[field].invalidAddresses) {
      issues.push({
        field,
        message: `Invalid email address: ${invalidAddress}`,
      });
    }

    if (field === "to" && parsedGroups.to.addresses.length === 0) {
      issues.push({
        field: "to",
        message: "Enter at least one valid To address.",
      });
    }
  }

  const groups = normalizeAddressGroups({
    to: parsedGroups.to.addresses,
    cc: parsedGroups.cc.addresses,
    bcc: parsedGroups.bcc.addresses,
  });
  const recipientCount = groups.to.length + groups.cc.length + groups.bcc.length;

  if (recipientCount > MAX_RECIPIENTS) {
    issues.push({
      field: "to",
      message: `Send to no more than ${MAX_RECIPIENTS} unique recipients at once.`,
    });
  }

  return { groups, issues };
}

function addAddressGroupIssues(
  input: RawAddressGroups,
  addIssue: (issue: { code: "custom"; path: AddressField[]; message: string }) => void,
): void {
  for (const issue of resolveAddressGroups(input).issues) {
    addIssue({ code: "custom", path: [issue.field], message: issue.message });
  }
}

export const emailAddressGroupsSchema = rawAddressGroupsSchema
  .superRefine((input, context) => {
    addAddressGroupIssues(input, (issue) => context.addIssue(issue));
  })
  .transform((input) => resolveAddressGroups(input).groups);

const rawEmailComposerSchema = rawAddressGroupsSchema.extend({
  accessToken: z
    .string()
    .min(16, { error: "Enter your access token." })
    .max(256, { error: "The access token is too long." }),
  university: universityNameSchema,
  idempotencyKey: z.uuid({ error: "Start a new send and try again." }),
});

export const emailComposerSchema = rawEmailComposerSchema
  .superRefine((input, context) => {
    addAddressGroupIssues(input, (issue) => context.addIssue(issue));
  })
  .transform((input) => {
    return {
      accessToken: input.accessToken,
      university: input.university,
      ...resolveAddressGroups(input).groups,
      idempotencyKey: input.idempotencyKey,
    };
  });

export type EmailComposerInput = z.input<typeof emailComposerSchema>;
export type ValidatedEmailComposerInput = z.output<typeof emailComposerSchema>;
export type EmailComposerField = keyof EmailComposerInput;
