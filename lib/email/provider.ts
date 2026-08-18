import type { AddressGroups } from "./schema";

export interface ProviderMessage extends AddressGroups {
  sender: {
    email: string;
    name: string;
  };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
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
