import { describe, expect, it, vi } from "vitest";

import { InMemoryIdempotencyStore } from "@/lib/idempotency";
import type { EmailProvider } from "@/lib/email/provider";
import { executeSendEmailWorkflow } from "@/lib/email/workflow";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

const ACCESS_TOKEN = "test-access-token-with-32-characters";

const validInput = {
  accessToken: ACCESS_TOKEN,
  fromName: "Product team",
  replyTo: "reply@example.com",
  recipients: "first@example.com, second@example.com",
  subject: "A useful update",
  message: "Hello from the product team.",
  idempotencyKey: "9f1e4648-138f-4472-9913-11aebf646956",
};

function createDependencies(provider: EmailProvider, maximumRequests = 5) {
  return {
    provider,
    senderEmail: "updates@example.com",
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
    const send = vi.fn(async ({ to }: { to: string }) =>
      to === "first@example.com"
        ? ({ status: "accepted", messageId: "message-1" } as const)
        : ({ status: "failed", failureKind: "permanent" } as const),
    );
    const dependencies = createDependencies({ send });

    const firstResult = await executeSendEmailWorkflow(validInput, dependencies);
    const replayedResult = await executeSendEmailWorkflow(validInput, dependencies);

    expect(firstResult).toEqual({
      status: "partial",
      replayed: false,
      summary: {
        acceptedCount: 1,
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
        ],
      },
    });
    expect(replayedResult).toMatchObject({
      status: "partial",
      replayed: true,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthorized requests before validation or provider access", async () => {
    const send = vi.fn();
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
    const send = vi.fn(async () => ({
      status: "accepted" as const,
      messageId: "message-1",
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
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("allows a safe retry after no recipients were accepted", async () => {
    const idempotencyKeys: string[] = [];
    const send = vi.fn(async ({ idempotencyKey }: { idempotencyKey: string }) => {
      idempotencyKeys.push(idempotencyKey);
      return { status: "failed", failureKind: "permanent" } as const;
    });
    const dependencies = createDependencies({ send });

    const firstResult = await executeSendEmailWorkflow(validInput, dependencies);
    const retryResult = await executeSendEmailWorkflow(validInput, dependencies);

    expect(firstResult).toMatchObject({
      status: "error",
      code: "send_failed",
      summary: { acceptedCount: 0, failedCount: 2 },
    });
    expect(retryResult).toMatchObject({ status: "error", code: "send_failed" });
    expect(send).toHaveBeenCalledTimes(4);
    expect(idempotencyKeys.slice(0, 2)).toEqual(idempotencyKeys.slice(2));
  });
});
