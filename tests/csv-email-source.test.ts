import { describe, expect, it, vi } from "vitest";

import {
  CsvInputError,
  parseEmailCsv,
} from "@/lib/email/csv-email-source";
import { sendCsvEmailBatch } from "@/lib/email/csv-email-batch";
import type { EmailProvider } from "@/lib/email/provider";

describe("parseEmailCsv", () => {
  it("parses To, CC, and BCC cells with shared normalization and deduplication", () => {
    const result = parseEmailCsv(`to,cc,bcc
Owner@EXAMPLE.COM,"owner@example.com; team@example.com",audit@example.com
second@example.com,,hidden@example.com`);

    expect(result).toEqual({
      rows: [
        {
          rowNumber: 2,
          to: ["Owner@example.com"],
          cc: ["team@example.com"],
          bcc: ["audit@example.com"],
        },
        {
          rowNumber: 3,
          to: ["second@example.com"],
          cc: [],
          bcc: ["hidden@example.com"],
        },
      ],
      errors: [],
    });
  });

  it("reports invalid rows while preserving valid rows", () => {
    const result = parseEmailCsv(`to,cc,bcc
valid@example.com,,
broken-address,also-broken,`);

    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        to: ["valid@example.com"],
        cc: [],
        bcc: [],
      },
    ]);
    expect(result.errors).toEqual([
      {
        rowNumber: 3,
        messages: [
          "To: Invalid email address: broken-address",
          "To: Enter at least one valid To address.",
          "CC: Invalid email address: also-broken",
        ],
      },
    ]);
  });

  it("rejects files without a To header", () => {
    expect(() => parseEmailCsv("email,cc\nfirst@example.com,")).toThrow(
      new CsvInputError('CSV must include a "to" header.'),
    );
  });
});

describe("sendCsvEmailBatch", () => {
  it("sends validated rows with bounded concurrency", async () => {
    let inFlight = 0;
    let maximumInFlight = 0;
    const send = vi.fn<EmailProvider["send"]>(async (message) => {
      inFlight += 1;
      maximumInFlight = Math.max(maximumInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;

      return {
        status: "completed",
        messageId: `message-${message.to[0]}`,
        accepted: [...message.to, ...message.cc, ...message.bcc],
        rejected: [],
      };
    });
    const rows = parseEmailCsv(`to,cc,bcc
one@example.com,,
two@example.com,visible@example.com,
three@example.com,,hidden@example.com`).rows;

    const result = await sendCsvEmailBatch({
      provider: { send },
      sender: { email: "updates@example.com", name: "Product team" },
      rows,
      concurrency: 2,
      retryDelayMs: 0,
    });

    expect(maximumInFlight).toBe(2);
    expect(send).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      acceptedCount: 5,
      failedCount: 0,
      rows: [
        { rowNumber: 2, summary: { acceptedCount: 1 } },
        { rowNumber: 3, summary: { acceptedCount: 2 } },
        { rowNumber: 4, summary: { acceptedCount: 2 } },
      ],
    });
  });

  it("checkpoints a resumed row after sending only its pending envelope recipients", async () => {
    const send = vi.fn<EmailProvider["send"]>(async (message) => ({
      status: "completed",
      messageId: "message-1",
      accepted: message.envelopeRecipients ?? [],
      rejected: [],
    }));
    const onRowComplete = vi.fn();

    const result = await sendCsvEmailBatch({
      provider: { send },
      sender: { email: "updates@example.com", name: "Product team" },
      rows: [
        {
          rowNumber: 2,
          to: ["already-sent@example.com"],
          cc: ["pending@example.com"],
          bcc: [],
          deliveryRecipients: ["pending@example.com"],
        },
      ],
      onRowComplete,
      retryDelayMs: 0,
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["already-sent@example.com"],
        cc: ["pending@example.com"],
        envelopeRecipients: ["pending@example.com"],
      }),
    );
    expect(result).toMatchObject({ acceptedCount: 1, failedCount: 0 });
    expect(onRowComplete).toHaveBeenCalledOnce();
  });
});
