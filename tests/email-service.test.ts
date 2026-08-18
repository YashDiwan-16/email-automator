import { describe, expect, it, vi } from "vitest";

import type {
  EmailProvider,
  ProviderMessage,
  ProviderSendResult,
} from "@/lib/email/provider";
import { universityNameSchema } from "@/lib/email/schema";
import { sendPredefinedEmail } from "@/lib/email/service";
import { createPredefinedEmailContent } from "@/lib/email/template";

const baseInput = {
  sender: { email: "updates@example.com", name: "Product team" },
  replyTo: "reply@example.com",
  personalization: {
    university: universityNameSchema.parse("XYZ University"),
  },
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
    const content = createPredefinedEmailContent(
      baseInput.personalization,
      baseInput.replyTo,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      sender: baseInput.sender,
      replyTo: baseInput.replyTo,
      to: baseInput.to,
      cc: baseInput.cc,
      bcc: baseInput.bcc,
      subject: "EduDeca – Invitation to Participate",
      text: content.text,
    });
    expect(messages[0]?.text).toContain("Dear Principal / Head of Institution,");
    expect(messages[0]?.text).toContain(
      "We invite XYZ University to express interest in participating in EduDeca – Wiz360",
    );
    expect(messages[0]?.text).toContain("What does Wiz360 test?");
    expect(messages[0]?.text).toContain("The 10-level journey");
    expect(messages[0]?.text).toContain(
      "Why should your institution participate?",
    );
    expect(messages[0]?.text).toContain("₹10 lakh first prize");
    expect(messages[0]?.text).toContain("28 Aug 2026");
    expect(messages[0]?.text).toContain(
      "Warm regards,\nSankar\nEduDeca – Wiz360\nPrincipal | reply@example.com",
    );
    expect(messages[0]?.text).not.toContain("{{");
    expect(messages[0]?.html).toContain("Dear Principal / Head of Institution");
    expect(messages[0]?.html).toContain("XYZ University");
    expect(messages[0]?.html).toContain("Sankar");
    expect(messages[0]?.html).toContain("Principal");
    expect(messages[0]?.html).toContain("EduDeca");
    expect(messages[0]?.html).not.toContain("{{");
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
