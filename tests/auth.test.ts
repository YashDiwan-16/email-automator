import { describe, expect, it } from "vitest";

import {
  authenticateCredentials,
  AuthenticationConfigurationError,
  createSessionToken,
  getAuthenticationConfiguration,
  verifySessionToken,
} from "@/lib/auth";

const AUTHENTICATION_CONFIGURATION = {
  username: "operator",
  password: "a-strong-browser-password",
  sessionSecret: "a-session-secret-that-is-at-least-32-characters-long",
};

describe("browser authentication", () => {
  it("accepts the configured username and password without exposing them in the identity", () => {
    const identity = authenticateCredentials(
      {
        username: " operator ",
        password: "a-strong-browser-password",
      },
      AUTHENTICATION_CONFIGURATION,
    );

    expect(identity).toMatch(/^[a-f\d]{64}$/u);
    expect(identity).not.toContain("operator");
    expect(
      authenticateCredentials(
        { username: "operator", password: "incorrect-password" },
        AUTHENTICATION_CONFIGURATION,
      ),
    ).toBeNull();
  });

  it("creates a signed session that expires at the configured time", async () => {
    const expiresAt = new Date("2026-08-18T12:00:00.000Z");
    const token = await createSessionToken(
      { identity: "authenticated-user", expiresAt },
      AUTHENTICATION_CONFIGURATION.sessionSecret,
    );

    await expect(
      verifySessionToken(
        token,
        AUTHENTICATION_CONFIGURATION.sessionSecret,
        new Date("2026-08-18T11:59:59.000Z"),
      ),
    ).resolves.toEqual({
      identity: "authenticated-user",
      expiresAt,
    });
    await expect(
      verifySessionToken(
        token,
        AUTHENTICATION_CONFIGURATION.sessionSecret,
        expiresAt,
      ),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, "another-session-secret-that-is-long-enough"),
    ).resolves.toBeNull();
  });

  it("validates all browser authentication environment variables", () => {
    expect(
      getAuthenticationConfiguration({
        EMAIL_AUTOMATOR_USERNAME: "operator",
        EMAIL_AUTOMATOR_PASSWORD: "a-strong-browser-password",
        EMAIL_AUTOMATOR_SESSION_SECRET:
          "a-session-secret-that-is-at-least-32-characters-long",
      }),
    ).toEqual(AUTHENTICATION_CONFIGURATION);

    expect(() =>
      getAuthenticationConfiguration({
        EMAIL_AUTOMATOR_USERNAME: "operator",
        EMAIL_AUTOMATOR_PASSWORD: "short",
        EMAIL_AUTOMATOR_SESSION_SECRET: "short",
      }),
    ).toThrow(AuthenticationConfigurationError);
  });
});
