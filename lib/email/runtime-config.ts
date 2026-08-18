import { z } from "zod";

import type {
  EmailSender,
  SmtpTransportConfiguration,
} from "./configuration";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmailAddress = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.email().optional(),
);

const emailRuntimeEnvironmentSchema = z
  .object({
    SMTP_SERVICE: optionalNonEmptyString,
    SMTP_HOST: optionalNonEmptyString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_REQUIRE_TLS: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    SMTP_USER: z.string().trim().min(1),
    SMTP_PASSWORD: z.string().min(1),
    MAIL_FROM_EMAIL: z.email(),
    MAIL_FROM_NAME: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[^<>\r\n]+$/u),
    MAIL_REPLY_TO: optionalEmailAddress,
  })
  .refine((value) => value.SMTP_SERVICE || value.SMTP_HOST, {
    path: ["SMTP_HOST"],
    message: "Set SMTP_SERVICE or SMTP_HOST.",
  });

export interface EmailRuntimeConfiguration {
  smtp: SmtpTransportConfiguration;
  sender: EmailSender;
  replyTo?: string;
}

export class EnvironmentConfigurationError extends Error {
  constructor() {
    super("Email service environment variables are invalid.");
    this.name = "EnvironmentConfigurationError";
  }
}

export function getEmailRuntimeConfiguration(
  environment: NodeJS.ProcessEnv,
): EmailRuntimeConfiguration {
  const result = emailRuntimeEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new EnvironmentConfigurationError();
  }

  return {
    smtp: {
      service: result.data.SMTP_SERVICE,
      host: result.data.SMTP_HOST,
      port: result.data.SMTP_PORT,
      secure: result.data.SMTP_SECURE,
      requireTls: result.data.SMTP_REQUIRE_TLS,
      user: result.data.SMTP_USER,
      password: result.data.SMTP_PASSWORD,
    },
    sender: {
      email: result.data.MAIL_FROM_EMAIL,
      name: result.data.MAIL_FROM_NAME,
    },
    replyTo: result.data.MAIL_REPLY_TO,
  };
}
