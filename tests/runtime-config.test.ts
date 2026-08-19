import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "@/lib/email/runtime-config";

describe("getEmailRuntimeConfiguration", () => {
  it("maps the EMAIL_SERVER variables to secure SMTP configuration", () => {
    expect(
      getEmailRuntimeConfiguration({
        EMAIL_SERVER_HOST: "smtp.gmail.com",
        EMAIL_SERVER_PORT: "465",
        EMAIL_SERVER_USER: "sender@gmail.com",
        EMAIL_SERVER_PASSWORD: "app-password",
        EMAIL_ADMIN: "admin@example.com",
      }),
    ).toEqual({
      smtp: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        requireTls: true,
        user: "sender@gmail.com",
        password: "app-password",
      },
      sender: {
        email: "admin@example.com",
        name: "EduDeca",
      },
      replyTo: "admin@example.com",
    });
  });

  it("uses STARTTLS mode for non-465 SMTP ports", () => {
    const configuration = getEmailRuntimeConfiguration({
      EMAIL_SERVER_HOST: "smtp.example.com",
      EMAIL_SERVER_PORT: "587",
      EMAIL_SERVER_USER: "sender",
      EMAIL_SERVER_PASSWORD: "password",
      EMAIL_ADMIN: "admin@example.com",
    });

    expect(configuration.smtp).toMatchObject({
      port: 587,
      secure: false,
      requireTls: true,
    });
  });

  it("rejects missing passwords and invalid admin addresses", () => {
    expect(() =>
      getEmailRuntimeConfiguration({
        EMAIL_SERVER_HOST: "smtp.gmail.com",
        EMAIL_SERVER_PORT: "465",
        EMAIL_SERVER_USER: "sender@gmail.com",
        EMAIL_SERVER_PASSWORD: "",
        EMAIL_ADMIN: "not-an-email",
      }),
    ).toThrow(EnvironmentConfigurationError);
  });
});
