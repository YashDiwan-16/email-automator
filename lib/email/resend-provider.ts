import "server-only";

import { Resend } from "resend";

import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "./provider";

const TEMPORARY_ERROR_NAMES = new Set([
  "concurrent_idempotent_requests",
  "internal_server_error",
  "rate_limit_exceeded",
]);

interface ResendErrorDetails {
  name: string;
  statusCode: number | null;
}

export function isTemporaryResendError(error: ResendErrorDetails): boolean {
  return (
    TEMPORARY_ERROR_NAMES.has(error.name) ||
    error.statusCode === 429 ||
    (error.statusCode !== null && error.statusCode >= 500) ||
    (error.name === "application_error" && error.statusCode === null)
  );
}

function formatSender(name: string, email: string): string {
  const escapedName = name.replace(/["\\]/gu, "\\$&");
  return `"${escapedName}" <${email}>`;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(message: ProviderMessage): Promise<ProviderSendResult> {
    try {
      const response = await this.resend.emails.send(
        {
          from: formatSender(message.sender.name, message.sender.email),
          to: message.to,
          replyTo: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
        { idempotencyKey: message.idempotencyKey },
      );

      if (response.error) {
        return {
          status: "failed",
          failureKind: isTemporaryResendError(response.error)
            ? "temporary"
            : "permanent",
        };
      }

      return { status: "accepted", messageId: response.data.id };
    } catch {
      return { status: "failed", failureKind: "permanent" };
    }
  }
}
