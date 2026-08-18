import type { DeliverySummary, RecipientDeliveryResult } from "@/types/email";

import type { EmailProvider, ProviderMessage, ProviderSendResult } from "./provider";
import { PREDEFINED_EMAIL_TEMPLATE } from "./template";

export interface PredefinedEmailInput {
  sender: {
    email: string;
    name: string;
  };
  replyTo?: string;
  to: string[];
  cc: string[];
  bcc: string[];
}

interface SendPredefinedEmailOptions {
  provider: EmailProvider;
  input: PredefinedEmailInput;
  maximumAttempts?: number;
  retryDelayMs?: number;
}

const DEFAULT_MAXIMUM_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 200;

async function wait(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function allRecipients(input: PredefinedEmailInput): string[] {
  return [...input.to, ...input.cc, ...input.bcc];
}

function deliverySummaryFromCompletedSend(
  recipients: string[],
  result: Extract<ProviderSendResult, { status: "completed" }>,
): DeliverySummary {
  const accepted = new Set(
    result.accepted.map((address) => address.toLocaleLowerCase("en-US")),
  );
  const recipientResults: RecipientDeliveryResult[] = recipients.map(
    (recipient) =>
      accepted.has(recipient.toLocaleLowerCase("en-US"))
        ? {
            recipient,
            status: "accepted",
            providerMessageId: result.messageId,
          }
        : {
            recipient,
            status: "failed",
            reason: "provider_rejected",
          },
  );

  return summarize(recipientResults);
}

function failedDeliverySummary(
  recipients: string[],
  reason: "delivery_status_unknown" | "provider_rejected" | "temporary_provider_failure",
): DeliverySummary {
  return summarize(
    recipients.map((recipient) => ({ recipient, status: "failed", reason })),
  );
}

function summarize(recipients: RecipientDeliveryResult[]): DeliverySummary {
  const acceptedCount = recipients.filter(
    (result) => result.status === "accepted",
  ).length;

  return {
    acceptedCount,
    failedCount: recipients.length - acceptedCount,
    recipients,
  };
}

export async function sendPredefinedEmail({
  provider,
  input,
  maximumAttempts = DEFAULT_MAXIMUM_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: SendPredefinedEmailOptions): Promise<DeliverySummary> {
  const recipients = allRecipients(input);
  const message: ProviderMessage = {
    ...input,
    subject: PREDEFINED_EMAIL_TEMPLATE.subject,
    html: PREDEFINED_EMAIL_TEMPLATE.html,
    text: PREDEFINED_EMAIL_TEMPLATE.text,
  };
  const attempts = Math.max(1, maximumAttempts);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let result: ProviderSendResult;

    try {
      result = await provider.send(message);
    } catch {
      return failedDeliverySummary(recipients, "delivery_status_unknown");
    }

    if (result.status === "completed") {
      return deliverySummaryFromCompletedSend(recipients, result);
    }

    if (result.failureKind === "permanent") {
      return failedDeliverySummary(recipients, "provider_rejected");
    }

    if (result.failureKind === "uncertain") {
      return failedDeliverySummary(recipients, "delivery_status_unknown");
    }

    if (attempt < attempts) {
      await wait(Math.max(0, retryDelayMs) * 2 ** (attempt - 1));
    }
  }

  return failedDeliverySummary(recipients, "temporary_provider_failure");
}
