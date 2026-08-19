import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { SmtpTransportConfiguration } from "./configuration";
import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "./provider";

interface NodemailerDeliveryInfo {
  accepted?: unknown[];
  rejected?: unknown[];
  rejectedErrors?: unknown[];
  messageId?: unknown;
}

export interface NodemailerTransport {
  sendMail(message: Mail.Options): Promise<NodemailerDeliveryInfo>;
}

function normalizeDeliveredAddresses(values: unknown[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return values.flatMap((value) => {
    if (typeof value === "string") {
      return [value];
    }

    if (
      typeof value === "object" &&
      value !== null &&
      typeof Reflect.get(value, "address") === "string"
    ) {
      return [Reflect.get(value, "address") as string];
    }

    return [];
  });
}

function readSmtpResponseCode(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const responseCode = Reflect.get(error, "responseCode");
  return typeof responseCode === "number" ? responseCode : null;
}

function readRejectedRecipient(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const recipient = Reflect.get(error, "recipient");
  return typeof recipient === "string" ? recipient : null;
}

function classifyResponseCode(responseCode: number | null) {
  return responseCode !== null && responseCode >= 400 && responseCode < 500
    ? ("temporary" as const)
    : ("permanent" as const);
}

function normalizeRejectedAddresses(
  rejected: unknown[] | undefined,
  rejectedErrors: unknown[] | undefined,
) {
  const errorsByRecipient = new Map(
    (rejectedErrors ?? []).flatMap((error) => {
      const recipient = readRejectedRecipient(error);
      return recipient
        ? [[recipient.toLocaleLowerCase("en-US"), error] as const]
        : [];
    }),
  );

  return normalizeDeliveredAddresses(rejected).map((recipient, index) => {
    const error =
      errorsByRecipient.get(recipient.toLocaleLowerCase("en-US")) ??
      rejectedErrors?.[index];

    return {
      recipient,
      failureKind: classifyResponseCode(readSmtpResponseCode(error)),
    };
  });
}

function classifyFailure(
  error: unknown,
): Extract<ProviderSendResult, { status: "failed" }> {
  const responseCode = readSmtpResponseCode(error);

  if (responseCode !== null && responseCode >= 400 && responseCode < 500) {
    return { status: "failed", failureKind: "temporary" };
  }

  if (responseCode !== null && responseCode >= 500) {
    return { status: "failed", failureKind: "permanent" };
  }

  return { status: "failed", failureKind: "uncertain" };
}

export class NodemailerEmailProvider implements EmailProvider {
  constructor(private readonly transport: NodemailerTransport) {}

  async send(message: ProviderMessage): Promise<ProviderSendResult> {
    try {
      const result = await this.transport.sendMail({
        from: {
          address: message.sender.email,
          name: message.sender.name,
        },
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments,
        ...(message.envelopeRecipients
          ? {
              envelope: {
                from: message.sender.email,
                to: message.envelopeRecipients,
              },
            }
          : {}),
      });

      return {
        status: "completed",
        messageId:
          typeof result.messageId === "string" ? result.messageId : "unknown",
        accepted: normalizeDeliveredAddresses(result.accepted),
        rejected: normalizeRejectedAddresses(
          result.rejected,
          result.rejectedErrors,
        ),
      };
    } catch (error) {
      if (typeof error === "object" && error !== null) {
        const rejected = Reflect.get(error, "rejected");
        if (Array.isArray(rejected) && rejected.length > 0) {
          const rejectedErrors = Reflect.get(error, "rejectedErrors");

          return {
            status: "completed",
            messageId: "unknown",
            accepted: [],
            rejected: normalizeRejectedAddresses(
              rejected,
              Array.isArray(rejectedErrors) ? rejectedErrors : undefined,
            ),
          };
        }
      }

      return classifyFailure(error);
    }
  }
}

export function createSmtpTransportOptions(
  configuration: SmtpTransportConfiguration,
): SMTPTransport.Options {
  return configuration.service
    ? {
        service: configuration.service,
        requireTLS: configuration.requireTls,
        auth: {
          user: configuration.user,
          pass: configuration.password,
        },
      }
    : {
        host: configuration.host,
        port: configuration.port,
        secure: configuration.secure,
        requireTLS: configuration.requireTls,
        auth: {
          user: configuration.user,
          pass: configuration.password,
        },
      };
}

export function createNodemailerEmailProvider(
  configuration: SmtpTransportConfiguration,
): NodemailerEmailProvider {
  return new NodemailerEmailProvider(
    nodemailer.createTransport(createSmtpTransportOptions(configuration)),
  );
}
