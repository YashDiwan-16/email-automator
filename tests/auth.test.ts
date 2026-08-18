import { describe, expect, it } from "vitest";

import {
  authenticateCredentials,
  CredentialConfigurationError,
  getCredentialConfiguration,
  loginCredentialsSchema,
} from "@/lib/auth";
import {
  createSessionToken,
  getSessionConfiguration,
  SessionConfigurationError,
  verifySessionToken,
} from "@/lib/session-token";

const CREDENTIAL_CONFIGURATION = {
  username: "operator",
  password: "a-strong-browser-password",
};
const SESSION_CONFIGURATION = {
  sessionSecret: "a-session-secret-that-is-at-least-32-characters-long",
};

describe("browser authentication", () => {
  it("accepts the configured username and password without exposing them in the identity", () => {
    const identity = authenticateCredentials(
      loginCredentialsSchema.parse({
        username: " operator ",
        password: "a-strong-browser-password",
      }),
      CREDENTIAL_CONFIGURATION,
    );

    expect(identity).toMatch(/^[a-f\d]{64}$/u);
    expect(identity).not.toContain("operator");
    expect(
      authenticateCredentials(
        loginCredentialsSchema.parse({
          username: "operator",
          password: "incorrect-password",
        }),
        CREDENTIAL_CONFIGURATION,
      ),
    ).toBeNull();
  });

  it("creates a signed session that expires at the configured time", async () => {
    const expiresAt = new Date("2026-08-18T12:00:00.000Z");
    const token = await createSessionToken(
      { identity: "authenticated-user", expiresAt },
      SESSION_CONFIGURATION.sessionSecret,
    );

    await expect(
      verifySessionToken(
        token,
        SESSION_CONFIGURATION.sessionSecret,
        new Date("2026-08-18T11:59:59.000Z"),
      ),
    ).resolves.toEqual({
      identity: "authenticated-user",
      expiresAt,
    });
    await expect(
      verifySessionToken(
        token,
        SESSION_CONFIGURATION.sessionSecret,
        expiresAt,
      ),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, "another-session-secret-that-is-long-enough"),
    ).resolves.toBeNull();
  });

  it("validates credential and session environment variables independently", () => {
    expect(
      getCredentialConfiguration({
        EMAIL_AUTOMATOR_USERNAME: "operator",
        EMAIL_AUTOMATOR_PASSWORD: "a-strong-browser-password",
      }),
    ).toEqual(CREDENTIAL_CONFIGURATION);
    expect(
      getSessionConfiguration({
        EMAIL_AUTOMATOR_SESSION_SECRET:
          "a-session-secret-that-is-at-least-32-characters-long",
      }),
    ).toEqual(SESSION_CONFIGURATION);

    expect(() =>
      getCredentialConfiguration({
        EMAIL_AUTOMATOR_USERNAME: "operator",
        EMAIL_AUTOMATOR_PASSWORD: "short",
      }),
    ).toThrow(CredentialConfigurationError);
    expect(() =>
      getSessionConfiguration({ EMAIL_AUTOMATOR_SESSION_SECRET: "short" }),
    ).toThrow(SessionConfigurationError);
  });
});
