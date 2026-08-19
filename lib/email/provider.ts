import type { AddressGroups } from "./schema";
import type { EmailSender } from "./configuration";

export interface ProviderAttachment {
  filename: string;
  path: string;
  cid: string;
  contentDisposition: "inline";
}

export interface ProviderMessage extends AddressGroups {
  sender: EmailSender;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments?: ProviderAttachment[];
  /** Restricts SMTP envelope delivery while preserving the visible headers. */
  envelopeRecipients?: string[];
}

export interface ProviderRecipientRejection {
  recipient: string;
  failureKind: "temporary" | "permanent";
}

export type ProviderSendResult =
  | {
      status: "completed";
      messageId: string;
      accepted: string[];
      rejected: ProviderRecipientRejection[];
    }
  | {
      status: "failed";
      failureKind: "temporary" | "permanent" | "uncertain";
    };

export interface EmailProvider {
  send(message: ProviderMessage): Promise<ProviderSendResult>;
}
