"use server";

import { EnvironmentConfigurationError, getServerEnvironment } from "@/lib/env";
import { ResendEmailProvider } from "@/lib/email/resend-provider";
import { executeSendEmailWorkflow } from "@/lib/email/workflow";
import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
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
  try {
    const environment = getServerEnvironment();

    return await executeSendEmailWorkflow(input, {
      expectedAccessToken: environment.EMAIL_AUTOMATOR_ACCESS_TOKEN,
      idempotencyStore,
      provider: new ResendEmailProvider(environment.RESEND_API_KEY),
      rateLimiter,
      senderEmail: environment.RESEND_FROM_EMAIL,
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
