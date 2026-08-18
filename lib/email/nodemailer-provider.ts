import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "./provider";

interface NodemailerDeliveryInfo {
  accepted?: unknown[];
  rejected?: unknown[];
  messageId?: unknown;
}

export interface NodemailerTransport {
  sendMail(message: Mail.Options): Promise<NodemailerDeliveryInfo>;
}

export interface SmtpTransportConfiguration {
  service?: string;
  host?: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
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
      });

      return {
        status: "completed",
        messageId:
          typeof result.messageId === "string" ? result.messageId : "unknown",
        accepted: normalizeDeliveredAddresses(result.accepted),
        rejected: normalizeDeliveredAddresses(result.rejected),
      };
    } catch (error) {
      return classifyFailure(error);
    }
  }
}

export function createNodemailerEmailProvider(
  configuration: SmtpTransportConfiguration,
): NodemailerEmailProvider {
  const connection: SMTPTransport.Options = configuration.service
    ? {
        service: configuration.service,
        auth: {
          user: configuration.user,
          pass: configuration.password,
        },
      }
    : {
        host: configuration.host,
        port: configuration.port,
        secure: configuration.secure,
        auth: {
          user: configuration.user,
          pass: configuration.password,
        },
      };

  return new NodemailerEmailProvider(nodemailer.createTransport(connection));
}
