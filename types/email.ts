export type DeliveryFailureReason =
  | "delivery_status_unknown"
  | "provider_rejected"
  | "temporary_provider_failure";

export type RecipientDeliveryResult =
  | {
      recipient: string;
      status: "accepted";
      providerMessageId: string;
    }
  | {
      recipient: string;
      status: "failed";
      reason: DeliveryFailureReason;
    };

export interface DeliverySummary {
  acceptedCount: number;
  failedCount: number;
  recipients: RecipientDeliveryResult[];
}

export type SendEmailErrorCode =
  | "configuration_error"
  | "idempotency_conflict"
  | "rate_limited"
  | "send_failed"
  | "unauthorized"
  | "validation_error";

export type SendEmailActionResult =
  | {
      status: "success" | "partial";
      summary: DeliverySummary;
      replayed: boolean;
    }
  | {
      status: "error";
      code: SendEmailErrorCode;
      message: string;
      fieldErrors?: Partial<Record<string, string[]>>;
      retryAfterSeconds?: number;
      summary?: DeliverySummary;
    };
