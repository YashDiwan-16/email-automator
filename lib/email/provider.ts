export interface ProviderMessage {
  sender: {
    email: string;
    name: string;
  };
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}

export type ProviderSendResult =
  | {
      status: "completed";
      messageId: string;
      accepted: string[];
      rejected: string[];
    }
  | {
      status: "failed";
      failureKind: "temporary" | "permanent" | "uncertain";
    };

export interface EmailProvider {
  send(message: ProviderMessage): Promise<ProviderSendResult>;
}
