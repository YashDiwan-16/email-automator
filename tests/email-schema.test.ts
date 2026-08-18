import { describe, expect, it } from "vitest";

import {
  emailComposerSchema,
  MAX_RECIPIENTS,
  parseRecipientList,
} from "@/lib/email/schema";

const validInput = {
  accessToken: "a-secure-access-token-value",
  fromName: "Product team",
  replyTo: "reply@example.com",
  recipients: "first@example.com",
  subject: "A useful update",
  message: "Hello from the product team.",
  idempotencyKey: "9f1e4648-138f-4472-9913-11aebf646956",
};

describe("parseRecipientList", () => {
  it("splits comma and newline separated addresses", () => {
    expect(
      parseRecipientList("first@example.com, second@example.com\nthird@example.com"),
    ).toEqual({
      recipients: [
        "first@example.com",
        "second@example.com",
        "third@example.com",
      ],
      invalidRecipients: [],
    });
  });

  it("normalizes domains and removes duplicates case-insensitively", () => {
    expect(
      parseRecipientList(
        " Alice@EXAMPLE.COM, alice@example.com, bob@b\u00fccher.de ",
      ),
    ).toEqual({
      recipients: ["Alice@example.com", "bob@xn--bcher-kva.de"],
      invalidRecipients: [],
    });
  });

  it("reports invalid addresses without discarding valid ones", () => {
    expect(parseRecipientList("valid@example.com, not-an-email, @example.com")).toEqual(
      {
        recipients: ["valid@example.com"],
        invalidRecipients: ["not-an-email", "@example.com"],
      },
    );
  });
});

describe("emailComposerSchema", () => {
  it("returns normalized recipients and reply-to addresses", () => {
    const result = emailComposerSchema.parse({
      ...validInput,
      replyTo: "Owner@EXAMPLE.COM",
      recipients: "One@Example.COM, one@example.com",
    });

    expect(result.replyTo).toBe("Owner@example.com");
    expect(result.recipients).toEqual(["One@example.com"]);
  });

  it("rejects invalid recipients and lists the invalid values", () => {
    const result = emailComposerSchema.safeParse({
      ...validInput,
      recipients: "ok@example.com, broken-address",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.recipients).toContain(
      "Invalid email address: broken-address",
    );
  });

  it("enforces the conservative recipient limit after deduplication", () => {
    const recipients = Array.from(
      { length: MAX_RECIPIENTS + 1 },
      (_, index) => `person-${index}@example.com`,
    ).join(",");

    const result = emailComposerSchema.safeParse({ ...validInput, recipients });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.recipients).toContain(
      `Send to no more than ${MAX_RECIPIENTS} recipients at once.`,
    );
  });

  it("rejects header control characters in sender names and subjects", () => {
    const senderResult = emailComposerSchema.safeParse({
      ...validInput,
      fromName: "Sender\nBcc: victim@example.com",
    });
    const subjectResult = emailComposerSchema.safeParse({
      ...validInput,
      subject: "Hello\r\nBcc: victim@example.com",
    });

    expect(senderResult.success).toBe(false);
    expect(subjectResult.success).toBe(false);
  });
});
