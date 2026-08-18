"use server";

import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { authenticateCredentials, loginCredentialsSchema } from "@/lib/auth";
import {
  AuthenticationConfigurationError,
  getAuthenticationEnvironment,
} from "@/lib/env";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import {
  createAuthenticatedSession,
  deleteAuthenticatedSession,
} from "@/lib/session";

const loginRateLimiter = new FixedWindowRateLimiter({
  maximumRequests: 5,
  windowMs: 15 * 60 * 1_000,
});

export async function login(formData: FormData): Promise<void> {
  const parsed = loginCredentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid_credentials");
  }

  let environment;
  try {
    environment = getAuthenticationEnvironment();
  } catch (error) {
    if (error instanceof AuthenticationConfigurationError) {
      redirect("/login?error=configuration");
    }

    throw error;
  }

  const throttleKey = parsed.data.username.toLocaleLowerCase("en-US");
  const rateLimit = loginRateLimiter.consume(throttleKey, randomUUID());
  if (!rateLimit.allowed) {
    redirect("/login?error=rate_limited");
  }

  const identity = authenticateCredentials(parsed.data, environment);
  if (!identity) {
    redirect("/login?error=invalid_credentials");
  }

  await createAuthenticatedSession(identity);
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteAuthenticatedSession();
  redirect("/login");
}
