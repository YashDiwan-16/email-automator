import { describe, expect, it, vi } from "vitest";

import { NodemailerEmailProvider } from "@/lib/email/nodemailer-provider";
import type { ProviderMessage } from "@/lib/email/provider";

const message: ProviderMessage = {
  sender: { email: "updates@example.com", name: "Product team" },
  to: ["primary@example.com"],
  cc: ["visible@example.com"],
  bcc: ["hidden@example.com"],
  replyTo: "reply@example.com",
  subject: "A useful update",
  html: "<p>Hello from the product team.</p>",
  text: "Hello from the product team.",
};

describe("NodemailerEmailProvider", () => {
  it("passes all address groups to Nodemailer and preserves partial acceptance", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "smtp-message-1",
      accepted: ["primary@example.com", "hidden@example.com"],
      rejected: ["visible@example.com"],
    });
    const provider = new NodemailerEmailProvider({ sendMail });

    const result = await provider.send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: { address: "updates@example.com", name: "Product team" },
      to: ["primary@example.com"],
      cc: ["visible@example.com"],
      bcc: ["hidden@example.com"],
      replyTo: "reply@example.com",
      subject: "A useful update",
      html: "<p>Hello from the product team.</p>",
      text: "Hello from the product team.",
    });
    expect(result).toEqual({
      status: "completed",
      messageId: "smtp-message-1",
      accepted: ["primary@example.com", "hidden@example.com"],
      rejected: ["visible@example.com"],
    });
  });

  it.each([
    [451, "temporary"],
    [550, "permanent"],
  ] as const)("maps SMTP %s failures to %s", async (responseCode, failureKind) => {
    const sendMail = vi.fn().mockRejectedValue(
      Object.assign(new Error("private SMTP response"), { responseCode }),
    );
    const provider = new NodemailerEmailProvider({ sendMail });

    await expect(provider.send(message)).resolves.toEqual({
      status: "failed",
      failureKind,
    });
  });

  it("marks ambiguous transport exceptions as uncertain without leaking details", async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValue(new Error("password=must-not-escape"));
    const provider = new NodemailerEmailProvider({ sendMail });

    const result = await provider.send(message);

    expect(result).toEqual({ status: "failed", failureKind: "uncertain" });
    expect(JSON.stringify(result)).not.toContain("must-not-escape");
  });
});
