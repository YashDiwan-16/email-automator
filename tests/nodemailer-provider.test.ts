import { describe, expect, it, vi } from "vitest";

import {
  createSmtpTransportOptions,
  NodemailerEmailProvider,
} from "@/lib/email/nodemailer-provider";
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
  attachments: [
    {
      filename: "logo.png",
      path: "/tmp/logo.png",
      cid: "brand-logo",
      contentDisposition: "inline",
    },
  ],
};

describe("NodemailerEmailProvider", () => {
  it("requires TLS upgrade for custom SMTP by default configuration", () => {
    expect(
      createSmtpTransportOptions({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        requireTls: true,
        user: "sender@example.com",
        password: "secret",
      }),
    ).toMatchObject({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTLS: true,
    });
  });

  it("passes all address groups to Nodemailer and preserves partial acceptance", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "smtp-message-1",
      accepted: ["primary@example.com", "hidden@example.com"],
      rejected: ["visible@example.com"],
      rejectedErrors: [
        { recipient: "visible@example.com", responseCode: 451 },
      ],
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
      attachments: message.attachments,
    });
    expect(result).toEqual({
      status: "completed",
      messageId: "smtp-message-1",
      accepted: ["primary@example.com", "hidden@example.com"],
      rejected: [
        { recipient: "visible@example.com", failureKind: "temporary" },
      ],
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

  it("preserves per-recipient failures when every envelope recipient is rejected", async () => {
    const sendMail = vi.fn().mockRejectedValue(
      Object.assign(new Error("all rejected"), {
        rejected: ["primary@example.com"],
        rejectedErrors: [
          { recipient: "primary@example.com", responseCode: 450 },
        ],
      }),
    );
    const provider = new NodemailerEmailProvider({ sendMail });

    await expect(provider.send(message)).resolves.toEqual({
      status: "completed",
      messageId: "unknown",
      accepted: [],
      rejected: [
        { recipient: "primary@example.com", failureKind: "temporary" },
      ],
    });
  });
});
