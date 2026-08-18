import "server-only";

import { createHash } from "node:crypto";

import { createAccessIdentity, isAuthorizedAccessToken } from "@/lib/auth";
import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import type { DeliverySummary, SendEmailActionResult } from "@/types/email";

import type { EmailSender } from "./configuration";
import type { EmailProvider } from "./provider";
import { emailComposerSchema } from "./schema";
import {
  type PredefinedEmailInput,
  sendPredefinedEmail,
} from "./service";
import { PREDEFINED_EMAIL_TEMPLATE } from "./template";

export interface EmailWorkflowDependencies {
  expectedAccessToken: string;
  idempotencyStore: InMemoryIdempotencyStore;
  provider: EmailProvider;
  rateLimiter: FixedWindowRateLimiter;
  sender: EmailSender;
  replyTo?: string;
}

function readAccessToken(input: unknown): string | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const accessToken = Reflect.get(input, "accessToken");
  return typeof accessToken === "string" ? accessToken : null;
}

function createSubmissionFingerprint(input: PredefinedEmailInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        templateVersion: PREDEFINED_EMAIL_TEMPLATE.version,
        ...input,
      }),
    )
    .digest("hex");
}

function resultFromSummary(
  summary: DeliverySummary,
  replayed: boolean,
): SendEmailActionResult {
  if (summary.acceptedCount === 0) {
    return {
      status: "error",
      code: "send_failed",
      message:
        "No emails were accepted. Check your SMTP configuration and try again.",
      summary,
    };
  }

  return {
    status: summary.failedCount > 0 ? "partial" : "success",
    summary,
    replayed,
  };
}

export async function executeSendEmailWorkflow(
  input: unknown,
  dependencies: EmailWorkflowDependencies,
): Promise<SendEmailActionResult> {
  const providedAccessToken = readAccessToken(input);
  if (
    !providedAccessToken ||
    !isAuthorizedAccessToken(
      providedAccessToken,
      dependencies.expectedAccessToken,
    )
  ) {
    return {
      status: "error",
      code: "unauthorized",
      message: "You are not authorized to send email.",
    };
  }

  const validationResult = emailComposerSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      status: "error",
      code: "validation_error",
      message: "Review the highlighted fields and try again.",
      fieldErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const validatedInput = validationResult.data;
  const accessIdentity = createAccessIdentity(providedAccessToken);
  const rateLimit = dependencies.rateLimiter.consume(
    accessIdentity,
    validatedInput.idempotencyKey,
  );
  if (!rateLimit.allowed) {
    return {
      status: "error",
      code: "rate_limited",
      message: "Too many send attempts. Please wait before trying again.",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    };
  }

  const deliveryInput: PredefinedEmailInput = {
    sender: dependencies.sender,
    replyTo: dependencies.replyTo,
    to: validatedInput.to,
    cc: validatedInput.cc,
    bcc: validatedInput.bcc,
  };
  const fingerprint = createSubmissionFingerprint(deliveryInput);
  const idempotencyResult = await dependencies.idempotencyStore.run(
    `${accessIdentity}:${validatedInput.idempotencyKey}`,
    fingerprint,
    () =>
      sendPredefinedEmail({
        provider: dependencies.provider,
        input: deliveryInput,
      }),
    (summary) => summary.acceptedCount > 0,
  );

  if (idempotencyResult.status === "conflict") {
    return {
      status: "error",
      code: "idempotency_conflict",
      message: "This send changed while it was processing. Start a new send.",
    };
  }

  return resultFromSummary(
    idempotencyResult.value,
    idempotencyResult.replayed,
  );
}
