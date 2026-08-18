import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const SESSION_ISSUER = "email-automator";
const SESSION_AUDIENCE = "email-automator-browser";

const normalizedUsernameSchema = z
  .string()
  .transform((value) => value.trim().normalize("NFKC"))
  .pipe(z.string().min(1).max(100));

export const loginCredentialsSchema = z.object({
  username: normalizedUsernameSchema,
  password: z.string().min(1).max(256),
});

const authenticationEnvironmentSchema = z.object({
  EMAIL_AUTOMATOR_USERNAME: normalizedUsernameSchema,
  EMAIL_AUTOMATOR_PASSWORD: z.string().min(12).max(256),
  EMAIL_AUTOMATOR_SESSION_SECRET: z.string().min(32).max(512),
});

export interface AuthenticationConfiguration {
  username: string;
  password: string;
  sessionSecret: string;
}

export interface AuthenticatedSession {
  identity: string;
  expiresAt: Date;
}

export class AuthenticationConfigurationError extends Error {
  constructor() {
    super("Browser authentication environment variables are invalid.");
    this.name = "AuthenticationConfigurationError";
  }
}

export function getAuthenticationConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): AuthenticationConfiguration {
  const result = authenticationEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new AuthenticationConfigurationError();
  }

  return {
    username: result.data.EMAIL_AUTOMATOR_USERNAME,
    password: result.data.EMAIL_AUTOMATOR_PASSWORD,
    sessionSecret: result.data.EMAIL_AUTOMATOR_SESSION_SECRET,
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
  input: z.input<typeof loginCredentialsSchema>,
  configuration: AuthenticationConfiguration,
): string | null {
  const result = loginCredentialsSchema.safeParse(input);
  if (!result.success) {
    return null;
  }

  const usernameMatches = securelyMatches(
    result.data.username,
    configuration.username,
  );
  const passwordMatches = securelyMatches(
    result.data.password,
    configuration.password,
  );

  return usernameMatches && passwordMatches
    ? createAuthenticatedIdentity(configuration.username)
    : null;
}

function sessionKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  session: AuthenticatedSession,
  secret: string,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(session.identity)
    .setIssuedAt()
    .setExpirationTime(Math.floor(session.expiresAt.getTime() / 1_000))
    .sign(sessionKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
  currentDate = new Date(),
): Promise<AuthenticatedSession | null> {
  try {
    const { payload } = await jwtVerify(token, sessionKey(secret), {
      algorithms: ["HS256"],
      audience: SESSION_AUDIENCE,
      issuer: SESSION_ISSUER,
      currentDate,
    });

    if (!payload.sub || !payload.exp) {
      return null;
    }

    return {
      identity: payload.sub,
      expiresAt: new Date(payload.exp * 1_000),
    };
  } catch {
    return null;
  }
}
