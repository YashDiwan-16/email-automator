import { describe, expect, it } from "vitest";

import {
  CsvDeliveryLedger,
  type CsvDeliveryLedgerContext,
} from "@/lib/email/csv-delivery-ledger";
import type { CsvEmailRow } from "@/lib/email/csv-email-source";

const row: CsvEmailRow = {
  rowNumber: 2,
  university: "XYZ University",
  to: ["primary@example.com"],
  cc: ["visible@example.com"],
  bcc: ["hidden@example.com"],
};

const context: CsvDeliveryLedgerContext = {
  senderEmail: "sender@example.com",
  replyTo: "reply@example.com",
  templateVersion: "template-v1",
};

describe("CsvDeliveryLedger", () => {
  it("resumes a partial row with only recipients that were not accepted", () => {
    const ledger = CsvDeliveryLedger.empty();
    const initialPlan = ledger.plan([row], context);

    ledger.recordAccepted(initialPlan[0]!, context, {
      acceptedCount: 2,
      failedCount: 1,
      recipients: [
        {
          recipient: "primary@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
        {
          recipient: "visible@example.com",
          status: "failed",
          reason: "provider_rejected",
        },
        {
          recipient: "hidden@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
      ],
    });

    expect(ledger.plan([row], context)).toEqual([
      { ...row, deliveryRecipients: ["visible@example.com"] },
    ]);
  });

  it("uses template version in the fingerprint and supports deliberate force sends", () => {
    const ledger = CsvDeliveryLedger.empty();
    const plan = ledger.plan([row], context);
    ledger.recordAccepted(plan[0]!, context, {
      acceptedCount: 3,
      failedCount: 0,
      recipients: [
        ...row.to,
        ...row.cc,
        ...row.bcc,
      ].map((recipient) => ({
        recipient,
        status: "accepted" as const,
        providerMessageId: "message-1",
      })),
    });

    expect(ledger.plan([row], context)).toEqual([]);
    expect(
      ledger.plan([row], { ...context, templateVersion: "template-v2" }),
    ).toHaveLength(1);
    expect(
      ledger.plan([{ ...row, university: "Another University" }], context),
    ).toHaveLength(1);
    expect(ledger.plan([row], context, { force: true })).toEqual([
      {
        ...row,
        deliveryRecipients: [
          "primary@example.com",
          "visible@example.com",
          "hidden@example.com",
        ],
      },
    ]);
  });

  it("serializes hashes without recipient addresses", () => {
    const ledger = CsvDeliveryLedger.empty();
    const plan = ledger.plan([row], context);
    ledger.recordAccepted(plan[0]!, context, {
      acceptedCount: 1,
      failedCount: 0,
      recipients: [
        {
          recipient: "primary@example.com",
          status: "accepted",
          providerMessageId: "message-1",
        },
      ],
    });

    const serialized = ledger.serialize();

    expect(serialized).not.toContain("primary@example.com");
    expect(CsvDeliveryLedger.parse(serialized).plan([row], context)).toEqual([
      {
        ...row,
        deliveryRecipients: ["visible@example.com", "hidden@example.com"],
      },
    ]);
  });
});
