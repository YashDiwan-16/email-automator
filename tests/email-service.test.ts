import { describe, expect, it, vi } from "vitest";

import { sendEmailBatch } from "@/lib/email/service";
import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "@/lib/email/provider";

const baseInput = {
  senderEmail: "updates@example.com",
  fromName: "Product team",
  replyTo: "reply@example.com",
  recipients: ["first@example.com"],
  subject: "A useful update",
  message: "Hello from the product team.",
  idempotencyKey: "9f1e4648-138f-4472-9913-11aebf646956",
};

function createProvider(
  send: (message: ProviderMessage) => Promise<ProviderSendResult>,
): EmailProvider {
  return { send };
}

describe("sendEmailBatch", () => {
  it("sends isolated HTML and plain-text messages with bounded concurrency", async () => {
    let inFlight = 0;
    let maximumInFlight = 0;
    const messages: ProviderMessage[] = [];
    const provider = createProvider(async (message) => {
      messages.push(message);
      inFlight += 1;
      maximumInFlight = Math.max(maximumInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { status: "accepted", messageId: `message-${messages.length}` };
    });

    const result = await sendEmailBatch({
      provider,
      input: {
        ...baseInput,
        recipients: [
          "first@example.com",
          "second@example.com",
          "third@example.com",
        ],
        message: "Hello <script>alert('unsafe')</script>\nSecond line.",
      },
      concurrency: 2,
      retryDelayMs: 0,
    });

    expect(maximumInFlight).toBe(2);
    expect(messages.map((message) => message.to)).toEqual([
      "first@example.com",
      "second@example.com",
      "third@example.com",
    ]);
    expect(messages.every((message) => !message.html.includes("<script>"))).toBe(
      true,
    );
    expect(messages[0]?.html).toContain("&lt;script&gt;");
    expect(messages[0]?.text).toBe(
      "Hello <script>alert('unsafe')</script>\nSecond line.",
    );
    expect(new Set(messages.map((message) => message.idempotencyKey)).size).toBe(
      3,
    );
    expect(result.acceptedCount).toBe(3);
    expect(result.failedCount).toBe(0);
  });

  it("retries temporary failures and does not retry permanent rejections", async () => {
    const attempts = new Map<string, number>();
    const provider = createProvider(async (message) => {
      const attempt = (attempts.get(message.to) ?? 0) + 1;
      attempts.set(message.to, attempt);

      if (message.to === "retry@example.com" && attempt === 1) {
        return { status: "failed", failureKind: "temporary" };
      }

      if (message.to === "rejected@example.com") {
        return { status: "failed", failureKind: "permanent" };
      }

      return { status: "accepted", messageId: `message-${attempt}` };
    });

    const result = await sendEmailBatch({
      provider,
      input: {
        ...baseInput,
        recipients: ["retry@example.com", "rejected@example.com"],
      },
      retryDelayMs: 0,
    });

    expect(attempts.get("retry@example.com")).toBe(2);
    expect(attempts.get("rejected@example.com")).toBe(1);
    expect(result).toMatchObject({
      acceptedCount: 1,
      failedCount: 1,
      recipients: [
        { recipient: "retry@example.com", status: "accepted" },
        {
          recipient: "rejected@example.com",
          status: "failed",
          reason: "provider_rejected",
        },
      ],
    });
  });

  it("sanitizes thrown provider errors after safe retry attempts", async () => {
    const send = vi.fn(async () => {
      throw new Error("secret provider diagnostic");
    });
    const provider = createProvider(send);

    const result = await sendEmailBatch({
      provider,
      input: baseInput,
      retryDelayMs: 0,
    });

    expect(send).toHaveBeenCalledTimes(3);
    expect(result.recipients).toEqual([
      {
        recipient: "first@example.com",
        status: "failed",
        reason: "temporary_provider_failure",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("secret provider diagnostic");
  });
});
