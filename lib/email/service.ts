import { render } from "react-email";

import type { DeliverySummary, RecipientDeliveryResult } from "@/types/email";

import type { EmailSender } from "./configuration";
import type { EmailProvider, ProviderMessage, ProviderSendResult } from "./provider";
import type { AddressGroups } from "./schema";
import {
  PREDEFINED_EMAIL_TEMPLATE,
  PredefinedEmailTemplate,
} from "./template";

export interface PredefinedEmailInput extends AddressGroups {
  sender: EmailSender;
  replyTo?: string;
  /** Sends only this envelope subset while retaining the complete visible headers. */
  deliveryRecipients?: string[];
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

function addressKey(address: string): string {
  return address.toLocaleLowerCase("en-US");
}

function allRecipients(input: PredefinedEmailInput): string[] {
  return [...input.to, ...input.cc, ...input.bcc];
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

function failureReason(
  failureKind: Extract<ProviderSendResult, { status: "failed" }>["failureKind"],
) {
  if (failureKind === "permanent") {
    return "provider_rejected" as const;
  }

  return failureKind === "uncertain"
    ? ("delivery_status_unknown" as const)
    : ("temporary_provider_failure" as const);
}

export async function sendPredefinedEmail({
  provider,
  input,
  maximumAttempts = DEFAULT_MAXIMUM_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
}: SendPredefinedEmailOptions): Promise<DeliverySummary> {
  const recipients = allRecipients(input);
  const deliveryRecipientKeys = input.deliveryRecipients
    ? new Set(input.deliveryRecipients.map(addressKey))
    : null;
  const targetRecipients = deliveryRecipientKeys
    ? recipients.filter((recipient) => deliveryRecipientKeys.has(addressKey(recipient)))
    : recipients;
  const html = await render(PredefinedEmailTemplate());
  const baseMessage: ProviderMessage = {
    sender: input.sender,
    replyTo: input.replyTo,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: PREDEFINED_EMAIL_TEMPLATE.subject,
    html,
    text: PREDEFINED_EMAIL_TEMPLATE.text,
  };
  const attempts = Math.max(1, maximumAttempts);
  const resolved = new Map<string, RecipientDeliveryResult>();
  let pendingRecipients = targetRecipients;

  for (let attempt = 1; attempt <= attempts && pendingRecipients.length > 0; attempt += 1) {
    const restrictEnvelope =
      input.deliveryRecipients !== undefined ||
      pendingRecipients.length !== recipients.length;
    const message: ProviderMessage = {
      ...baseMessage,
      ...(restrictEnvelope ? { envelopeRecipients: pendingRecipients } : {}),
    };
    let result: ProviderSendResult;

    try {
      result = await provider.send(message);
    } catch {
      for (const recipient of pendingRecipients) {
        resolved.set(addressKey(recipient), {
          recipient,
          status: "failed",
          reason: "delivery_status_unknown",
        });
      }
      break;
    }

    if (result.status === "failed") {
      if (result.failureKind === "temporary" && attempt < attempts) {
        await wait(Math.max(0, retryDelayMs) * 2 ** (attempt - 1));
        continue;
      }

      for (const recipient of pendingRecipients) {
        resolved.set(addressKey(recipient), {
          recipient,
          status: "failed",
          reason: failureReason(result.failureKind),
        });
      }
      break;
    }

    const accepted = new Set(result.accepted.map(addressKey));
    const rejected = new Map(
      result.rejected.map((rejection) => [
        addressKey(rejection.recipient),
        rejection.failureKind,
      ]),
    );
    const nextPending: string[] = [];

    for (const recipient of pendingRecipients) {
      const key = addressKey(recipient);
      if (accepted.has(key)) {
        resolved.set(key, {
          recipient,
          status: "accepted",
          providerMessageId: result.messageId,
        });
        continue;
      }

      if (rejected.get(key) === "temporary" && attempt < attempts) {
        nextPending.push(recipient);
        continue;
      }

      resolved.set(key, {
        recipient,
        status: "failed",
        reason:
          rejected.get(key) === "temporary"
            ? "temporary_provider_failure"
            : "provider_rejected",
      });
    }

    pendingRecipients = nextPending;
    if (pendingRecipients.length > 0) {
      await wait(Math.max(0, retryDelayMs) * 2 ** (attempt - 1));
    }
  }

  return summarize(
    targetRecipients.map(
      (recipient) =>
        resolved.get(addressKey(recipient)) ?? {
          recipient,
          status: "failed",
          reason: "delivery_status_unknown",
        },
    ),
  );
}
