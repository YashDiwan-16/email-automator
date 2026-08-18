import { describe, expect, it } from "vitest";

import {
  emailComposerSchema,
  MAX_RECIPIENTS,
  parseAddressList,
} from "@/lib/email/schema";

const validInput = {
  accessToken: "a-secure-access-token-value",
  to: "first@example.com",
  cc: "",
  bcc: "",
  idempotencyKey: "9f1e4648-138f-4472-9913-11aebf646956",
};

describe("parseAddressList", () => {
  it("splits comma, semicolon, and newline separated addresses", () => {
    expect(
      parseAddressList(
        "first@example.com, second@example.com; third@example.com\nfourth@example.com",
      ),
    ).toEqual({
      addresses: [
        "first@example.com",
        "second@example.com",
        "third@example.com",
        "fourth@example.com",
      ],
      invalidAddresses: [],
    });
  });

  it("normalizes domains and removes duplicates case-insensitively", () => {
    expect(
      parseAddressList(
        " Alice@EXAMPLE.COM, alice@example.com, bob@b\u00fccher.de ",
      ),
    ).toEqual({
      addresses: ["Alice@example.com", "bob@xn--bcher-kva.de"],
      invalidAddresses: [],
    });
  });

  it("reports invalid addresses without discarding valid ones", () => {
    expect(
      parseAddressList("valid@example.com, not-an-email, @example.com"),
    ).toEqual({
      addresses: ["valid@example.com"],
      invalidAddresses: ["not-an-email", "@example.com"],
    });
  });
});

describe("emailComposerSchema", () => {
  it("normalizes and deduplicates across To, CC, and BCC", () => {
    const result = emailComposerSchema.parse({
      ...validInput,
      to: "Owner@EXAMPLE.COM",
      cc: "owner@example.com, teammate@example.com",
      bcc: "TEAMMATE@example.com; audit@example.com",
    });

    expect(result.to).toEqual(["Owner@example.com"]);
    expect(result.cc).toEqual(["teammate@example.com"]);
    expect(result.bcc).toEqual(["audit@example.com"]);
  });

  it("requires at least one valid To address while allowing empty CC and BCC", () => {
    expect(emailComposerSchema.safeParse(validInput).success).toBe(true);

    const result = emailComposerSchema.safeParse({ ...validInput, to: "" });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.to).toContain(
      "Enter at least one valid To address.",
    );
  });

  it("associates invalid addresses with their field", () => {
    const result = emailComposerSchema.safeParse({
      ...validInput,
      cc: "ok@example.com, broken-address",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.cc).toContain(
      "Invalid email address: broken-address",
    );
  });

  it("enforces the conservative combined recipient limit after deduplication", () => {
    const to = Array.from(
      { length: MAX_RECIPIENTS },
      (_, index) => `person-${index}@example.com`,
    ).join(",");

    const result = emailComposerSchema.safeParse({
      ...validInput,
      to,
      cc: "person-0@example.com, over-limit@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.to).toContain(
      `Send to no more than ${MAX_RECIPIENTS} unique recipients at once.`,
    );
  });
});
