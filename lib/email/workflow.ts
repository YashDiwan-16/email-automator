import "server-only";

import { createHash } from "node:crypto";

import { createAccessIdentity, isAuthorizedAccessToken } from "@/lib/auth";
import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import type { DeliverySummary, SendEmailActionResult } from "@/types/email";

import type { EmailProvider } from "./provider";
import { emailComposerSchema } from "./schema";
import { type EmailBatchInput, sendEmailBatch } from "./service";

export interface EmailWorkflowDependencies {
  expectedAccessToken: string;
  idempotencyStore: InMemoryIdempotencyStore;
  provider: EmailProvider;
  rateLimiter: FixedWindowRateLimiter;
  senderEmail: string;
}

function readAccessToken(input: unknown): string | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const accessToken = Reflect.get(input, "accessToken");
  return typeof accessToken === "string" ? accessToken : null;
}

function createSubmissionFingerprint(
  input: EmailBatchInput,
): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
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
        "No emails were accepted. Check your sender configuration and try again.",
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

  const batchInput: EmailBatchInput = {
    senderEmail: dependencies.senderEmail,
    fromName: validatedInput.fromName,
    replyTo: validatedInput.replyTo,
    recipients: validatedInput.recipients,
    subject: validatedInput.subject,
    message: validatedInput.message,
    idempotencyKey: validatedInput.idempotencyKey,
  };
  const fingerprint = createSubmissionFingerprint(batchInput);
  const idempotencyResult = await dependencies.idempotencyStore.run(
    `${accessIdentity}:${validatedInput.idempotencyKey}`,
    fingerprint,
    () =>
      sendEmailBatch({
        provider: dependencies.provider,
        input: batchInput,
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
