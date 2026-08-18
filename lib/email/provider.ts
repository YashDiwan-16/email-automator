export interface ProviderMessage {
  sender: {
    email: string;
    name: string;
  };
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export type ProviderSendResult =
  | {
      status: "accepted";
      messageId: string;
    }
  | {
      status: "failed";
      failureKind: "temporary" | "permanent";
    };

export interface EmailProvider {
  send(message: ProviderMessage): Promise<ProviderSendResult>;
}
