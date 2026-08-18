import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const normalizedUsernameSchema = z
  .string()
  .transform((value) => value.trim().normalize("NFKC"))
  .pipe(z.string().min(1).max(100));

export const loginCredentialsSchema = z.object({
  username: normalizedUsernameSchema,
  password: z.string().min(1).max(256),
});

const credentialEnvironmentSchema = z.object({
  EMAIL_AUTOMATOR_USERNAME: normalizedUsernameSchema,
  EMAIL_AUTOMATOR_PASSWORD: z.string().min(12).max(256),
});

export type LoginCredentials = z.output<typeof loginCredentialsSchema>;

export interface CredentialConfiguration {
  username: string;
  password: string;
}

export class CredentialConfigurationError extends Error {
  constructor() {
    super("Browser credential environment variables are invalid.");
    this.name = "CredentialConfigurationError";
  }
}

export function getCredentialConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): CredentialConfiguration {
  const result = credentialEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new CredentialConfigurationError();
  }

  return {
    username: result.data.EMAIL_AUTOMATOR_USERNAME,
    password: result.data.EMAIL_AUTOMATOR_PASSWORD,
  };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function securelyMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(digest(provided), digest(expected));
}

function createAuthenticatedIdentity(username: string): string {
  return createHash("sha256")
    .update(`email-automator:${username}`, "utf8")
    .digest("hex");
}

export function authenticateCredentials(
  credentials: LoginCredentials,
  configuration: CredentialConfiguration,
): string | null {
  const usernameMatches = securelyMatches(
    credentials.username,
    configuration.username,
  );
  const passwordMatches = securelyMatches(
    credentials.password,
    configuration.password,
  );

  return usernameMatches && passwordMatches
    ? createAuthenticatedIdentity(configuration.username)
    : null;
}
