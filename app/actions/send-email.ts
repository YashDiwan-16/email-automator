"use server";

import { EnvironmentConfigurationError, getServerEnvironment } from "@/lib/env";
import { createNodemailerEmailProvider } from "@/lib/email/nodemailer-provider";
import { executeSendEmailWorkflow } from "@/lib/email/workflow";
import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { readAuthenticatedSession } from "@/lib/session";
import type { SendEmailActionResult } from "@/types/email";

const rateLimiter = new FixedWindowRateLimiter({
  maximumRequests: 5,
  windowMs: 10 * 60 * 1_000,
});

const idempotencyStore = new InMemoryIdempotencyStore({
  ttlMs: 15 * 60 * 1_000,
  maximumEntries: 500,
});

export async function sendEmail(
  input: unknown,
): Promise<SendEmailActionResult> {
  const session = await readAuthenticatedSession();
  if (!session) {
    return {
      status: "error",
      code: "unauthorized",
      message: "Your session has expired. Sign in again.",
    };
  }

  try {
    const environment = getServerEnvironment();

    return await executeSendEmailWorkflow(input, {
      authenticatedIdentity: session.identity,
      idempotencyStore,
      provider: createNodemailerEmailProvider(environment.smtp),
      rateLimiter,
      sender: environment.sender,
      replyTo: environment.replyTo,
    });
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      return {
        status: "error",
        code: "configuration_error",
        message: "Email sending is not configured. Contact the administrator.",
      };
    }

    return {
      status: "error",
      code: "send_failed",
      message: "The send could not be completed. Please try again.",
    };
  }
}
