import { describe, expect, it, vi } from "vitest";

import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "@/lib/email/provider";
import { sendPredefinedEmail } from "@/lib/email/service";
import { PREDEFINED_EMAIL_TEMPLATE } from "@/lib/email/template";

const baseInput = {
  sender: { email: "updates@example.com", name: "Product team" },
  replyTo: "reply@example.com",
  to: ["primary@example.com"],
  cc: ["visible@example.com"],
  bcc: ["hidden@example.com"],
};

function createProvider(
  send: (message: ProviderMessage) => Promise<ProviderSendResult>,
): EmailProvider {
  return { send };
}

describe("sendPredefinedEmail", () => {
  it("sends one message using only the predefined code template", async () => {
    const messages: ProviderMessage[] = [];
    const provider = createProvider(async (message) => {
      messages.push(message);
      return {
        status: "completed",
        messageId: "message-1",
        accepted: [...message.to, ...message.cc, ...message.bcc],
        rejected: [],
      };
    });

    const result = await sendPredefinedEmail({ provider, input: baseInput });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      ...baseInput,
      subject: PREDEFINED_EMAIL_TEMPLATE.subject,
      text: PREDEFINED_EMAIL_TEMPLATE.text,
    });
    expect(messages[0]?.html).toContain("A quick update");
    expect(result).toEqual({
      acceptedCount: 3,
      failedCount: 0,
      recipients: [
        {
          recipient: "primary@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
        {
          recipient: "visible@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
        {
          recipient: "hidden@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
      ],
    });
  });

  it("reports partially rejected SMTP recipients", async () => {
    const provider = createProvider(async () => ({
      status: "completed",
      messageId: "message-1",
      accepted: ["primary@example.com", "hidden@example.com"],
      rejected: [
        { recipient: "visible@example.com", failureKind: "permanent" },
      ],
    }));

    const result = await sendPredefinedEmail({ provider, input: baseInput });

    expect(result).toMatchObject({
      acceptedCount: 2,
      failedCount: 1,
      recipients: [
        { recipient: "primary@example.com", status: "accepted" },
        {
          recipient: "visible@example.com",
          status: "failed",
          reason: "provider_rejected",
        },
        { recipient: "hidden@example.com", status: "accepted" },
      ],
    });
  });

  it("retries explicit temporary SMTP failures", async () => {
    const send = vi
      .fn<EmailProvider["send"]>()
      .mockResolvedValueOnce({ status: "failed", failureKind: "temporary" })
      .mockResolvedValueOnce({
        status: "completed",
        messageId: "message-2",
        accepted: ["primary@example.com", "visible@example.com", "hidden@example.com"],
        rejected: [],
      });

    const result = await sendPredefinedEmail({
      provider: { send },
      input: baseInput,
      retryDelayMs: 0,
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.acceptedCount).toBe(3);
  });

  it("retries only temporarily rejected recipients without resending accepted ones", async () => {
    const messages: ProviderMessage[] = [];
    const send = vi.fn<EmailProvider["send"]>(async (message) => {
      messages.push(message);

      if (messages.length === 1) {
        return {
          status: "completed",
          messageId: "message-1",
          accepted: ["primary@example.com", "hidden@example.com"],
          rejected: [
            { recipient: "visible@example.com", failureKind: "temporary" },
          ],
        };
      }

      return {
        status: "completed",
        messageId: "message-2",
        accepted: ["visible@example.com"],
        rejected: [],
      };
    });

    const result = await sendPredefinedEmail({
      provider: { send },
      input: baseInput,
      retryDelayMs: 0,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.envelopeRecipients).toBeUndefined();
    expect(messages[1]?.envelopeRecipients).toEqual(["visible@example.com"]);
    expect(result.acceptedCount).toBe(3);
    expect(result.failedCount).toBe(0);
  });

  it.each(["permanent", "uncertain"] as const)(
    "does not retry %s failures or expose provider diagnostics",
    async (failureKind) => {
      const send = vi
        .fn<EmailProvider["send"]>()
        .mockResolvedValue({ status: "failed", failureKind });

      const result = await sendPredefinedEmail({
        provider: { send },
        input: baseInput,
        retryDelayMs: 0,
      });

      expect(send).toHaveBeenCalledTimes(1);
      expect(result.acceptedCount).toBe(0);
      expect(result.recipients).toEqual(
        [...baseInput.to, ...baseInput.cc, ...baseInput.bcc].map((recipient) => ({
          recipient,
          status: "failed",
          reason:
            failureKind === "uncertain"
              ? "delivery_status_unknown"
              : "provider_rejected",
        })),
      );
    },
  );
});
