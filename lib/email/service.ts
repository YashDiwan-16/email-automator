import { createHash } from "node:crypto";

import { render } from "react-email";

import type { ValidatedEmailComposerInput } from "@/lib/email/schema";
import type { DeliverySummary, RecipientDeliveryResult } from "@/types/email";

import type { EmailProvider, ProviderMessage } from "./provider";
import { EmailMessageTemplate } from "./template";

export type EmailBatchInput = Omit<
  ValidatedEmailComposerInput,
  "accessToken"
> & {
  senderEmail: string;
};

interface SendEmailBatchOptions {
  provider: EmailProvider;
  input: EmailBatchInput;
  concurrency?: number;
  maximumAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAXIMUM_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 200;

function createProviderIdempotencyKey(
  submissionKey: string,
  recipient: string,
): string {
  const recipientHash = createHash("sha256")
    .update(recipient.toLocaleLowerCase("en-US"))
    .digest("hex")
    .slice(0, 16);

  return `${submissionKey}:${recipientHash}`;
}

async function wait(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function deliverRecipient(
  provider: EmailProvider,
  message: ProviderMessage,
  maximumAttempts: number,
  retryDelayMs: number,
): Promise<RecipientDeliveryResult> {
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const result = await provider.send(message);

      if (result.status === "accepted") {
        return {
          recipient: message.to,
          status: "accepted",
          providerMessageId: result.messageId,
        };
      }

      if (result.failureKind === "permanent") {
        return {
          recipient: message.to,
          status: "failed",
          reason: "provider_rejected",
        };
      }
    } catch {
      // Network and unknown provider exceptions are retried without exposing details.
    }

    if (attempt < maximumAttempts) {
      await wait(retryDelayMs * 2 ** (attempt - 1));
    }
  }

  return {
    recipient: message.to,
    status: "failed",
    reason: "temporary_provider_failure",
  };
}

async function mapWithConcurrency<T, TResult>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await operation(values[currentIndex] as T);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), values.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

export async function sendEmailBatch({
  provider,
  input,
  concurrency = DEFAULT_CONCURRENCY,
  maximumAttempts = DEFAULT_MAXIMUM_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: SendEmailBatchOptions): Promise<DeliverySummary> {
  const html = await render(
    EmailMessageTemplate({
      fromName: input.fromName,
      message: input.message,
      subject: input.subject,
    }),
  );

  const recipientResults = await mapWithConcurrency(
    input.recipients,
    concurrency,
    (recipient) =>
      deliverRecipient(
        provider,
        {
          sender: { email: input.senderEmail, name: input.fromName },
          to: recipient,
          replyTo: input.replyTo,
          subject: input.subject,
          html,
          text: input.message,
          idempotencyKey: createProviderIdempotencyKey(
            input.idempotencyKey,
            recipient,
          ),
        },
        Math.max(1, maximumAttempts),
        Math.max(0, retryDelayMs),
      ),
  );
  const acceptedCount = recipientResults.filter(
    (result) => result.status === "accepted",
  ).length;

  return {
    acceptedCount,
    failedCount: recipientResults.length - acceptedCount,
    recipients: recipientResults,
  };
}
