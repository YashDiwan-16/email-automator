import { describe, expect, it } from "vitest";

import { isTemporaryResendError } from "@/lib/email/resend-provider";

describe("isTemporaryResendError", () => {
  it.each([
    [{ name: "rate_limit_exceeded", statusCode: 429 }, true],
    [{ name: "internal_server_error", statusCode: 503 }, true],
    [{ name: "application_error", statusCode: null }, true],
    [{ name: "concurrent_idempotent_requests", statusCode: 409 }, true],
    [{ name: "application_error", statusCode: 400 }, false],
    [{ name: "invalid_api_key", statusCode: 401 }, false],
    [{ name: "validation_error", statusCode: 422 }, false],
  ])("classifies %o as temporary=%s", (error, expected) => {
    expect(isTemporaryResendError(error)).toBe(expected);
  });
});
