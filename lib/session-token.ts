import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const SESSION_ISSUER = "email-automator";
const SESSION_AUDIENCE = "email-automator-browser";

const sessionEnvironmentSchema = z.object({
  EMAIL_AUTOMATOR_SESSION_SECRET: z.string().min(32).max(512),
});

export interface SessionConfiguration {
  sessionSecret: string;
}

export interface AuthenticatedSession {
  identity: string;
  expiresAt: Date;
}

export class SessionConfigurationError extends Error {
  constructor() {
    super("Browser session environment variables are invalid.");
    this.name = "SessionConfigurationError";
  }
}

export function getSessionConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): SessionConfiguration {
  const result = sessionEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new SessionConfigurationError();
  }

  return { sessionSecret: result.data.EMAIL_AUTOMATOR_SESSION_SECRET };
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
