import { describe, expect, it, vi } from "vitest";

import type { EmailProvider } from "@/lib/email/provider";
import { executeSendEmailWorkflow } from "@/lib/email/workflow";
import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

const ACCESS_TOKEN = "test-access-token-with-32-characters";

const validInput = {
  accessToken: ACCESS_TOKEN,
  university: "XYZ University",
  to: "first@example.com",
  cc: "second@example.com",
  bcc: "audit@example.com",
  idempotencyKey: "9f1e4648-138f-4472-9913-11aebf646956",
};

function createDependencies(provider: EmailProvider, maximumRequests = 5) {
  return {
    provider,
    sender: { email: "updates@example.com", name: "Product team" },
    replyTo: "reply@example.com",
    expectedAccessToken: ACCESS_TOKEN,
    rateLimiter: new FixedWindowRateLimiter({
      maximumRequests,
      windowMs: 60_000,
    }),
    idempotencyStore: new InMemoryIdempotencyStore({
      ttlMs: 60_000,
      maximumEntries: 100,
    }),
  };
}

describe("executeSendEmailWorkflow", () => {
  it("authorizes, validates, delivers, reports partial failure, and deduplicates retries", async () => {
    const send = vi.fn<EmailProvider["send"]>(async () => ({
      status: "completed",
      messageId: "message-1",
      accepted: ["first@example.com", "audit@example.com"],
      rejected: [
        { recipient: "second@example.com", failureKind: "permanent" },
      ],
    }));
    const dependencies = createDependencies({ send });

    const firstResult = await executeSendEmailWorkflow(validInput, dependencies);
    const replayedResult = await executeSendEmailWorkflow(validInput, dependencies);

    expect(firstResult).toEqual({
      status: "partial",
      replayed: false,
      summary: {
        acceptedCount: 2,
        failedCount: 1,
        recipients: [
          {
            recipient: "first@example.com",
            status: "accepted",
            providerMessageId: "message-1",
          },
          {
            recipient: "second@example.com",
            status: "failed",
            reason: "provider_rejected",
          },
          {
            recipient: "audit@example.com",
            status: "accepted",
            providerMessageId: "message-1",
          },
        ],
      },
    });
    expect(replayedResult).toMatchObject({
      status: "partial",
      replayed: true,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthorized requests before validation or provider access", async () => {
    const send = vi.fn<EmailProvider["send"]>();
    const dependencies = createDependencies({ send });

    const result = await executeSendEmailWorkflow(
      { accessToken: "incorrect-token" },
      dependencies,
    );

    expect(result).toEqual({
      status: "error",
      code: "unauthorized",
      message: "You are not authorized to send email.",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("rate limits an authorized sender before a second submission", async () => {
    const send = vi.fn<EmailProvider["send"]>(async (message) => ({
      status: "completed",
      messageId: "message-1",
      accepted: [...message.to, ...message.cc, ...message.bcc],
      rejected: [],
    }));
    const dependencies = createDependencies({ send }, 1);

    await executeSendEmailWorkflow(validInput, dependencies);
    const result = await executeSendEmailWorkflow(
      {
        ...validInput,
        idempotencyKey: "07b75abe-2387-449d-8541-9fa70458a176",
      },
      dependencies,
    );

    expect(result).toMatchObject({
      status: "error",
      code: "rate_limited",
      message: "Too many send attempts. Please wait before trying again.",
    });
    expect(result.status === "error" && result.retryAfterSeconds).toBeGreaterThan(
      0,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after no recipients were accepted", async () => {
    const send = vi
      .fn<EmailProvider["send"]>()
      .mockResolvedValue({ status: "failed", failureKind: "permanent" });
    const dependencies = createDependencies({ send });

    const firstResult = await executeSendEmailWorkflow(validInput, dependencies);
    const retryResult = await executeSendEmailWorkflow(validInput, dependencies);

    expect(firstResult).toMatchObject({
      status: "error",
      code: "send_failed",
      summary: { acceptedCount: 0, failedCount: 3 },
    });
    expect(retryResult).toMatchObject({ status: "error", code: "send_failed" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects reuse of an idempotency key for changed recipients", async () => {
    const send = vi.fn<EmailProvider["send"]>(async (message) => ({
      status: "completed",
      messageId: "message-1",
      accepted: [...message.to, ...message.cc, ...message.bcc],
      rejected: [],
    }));
    const dependencies = createDependencies({ send });

    await executeSendEmailWorkflow(validInput, dependencies);
    const result = await executeSendEmailWorkflow(
      { ...validInput, to: "changed@example.com" },
      dependencies,
    );

    expect(result).toMatchObject({
      status: "error",
      code: "idempotency_conflict",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of an idempotency key for a changed university", async () => {
    const send = vi.fn<EmailProvider["send"]>(async (message) => ({
      status: "completed",
      messageId: "message-1",
      accepted: [...message.to, ...message.cc, ...message.bcc],
      rejected: [],
    }));
    const dependencies = createDependencies({ send });

    await executeSendEmailWorkflow(validInput, dependencies);
    const result = await executeSendEmailWorkflow(
      { ...validInput, university: "Another University" },
      dependencies,
    );

    expect(result).toMatchObject({
      status: "error",
      code: "idempotency_conflict",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
