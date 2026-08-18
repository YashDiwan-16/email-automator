import "server-only";

import { cookies } from "next/headers";

import {
  type AuthenticatedSession,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";
import {
  AuthenticationConfigurationError,
  getAuthenticationEnvironment,
} from "@/lib/env";

export const SESSION_COOKIE_NAME = "email-automator-session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1_000;

export async function createAuthenticatedSession(
  identity: string,
): Promise<void> {
  const environment = getAuthenticationEnvironment();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await createSessionToken(
    { identity, expiresAt },
    environment.sessionSecret,
  );
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: environment.secureCookies,
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
    priority: "high",
  });
}

export async function readAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const environment = getAuthenticationEnvironment();
    return verifySessionToken(token, environment.sessionSecret);
  } catch (error) {
    if (error instanceof AuthenticationConfigurationError) {
      return null;
    }

    throw error;
  }
}

export async function deleteAuthenticatedSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
