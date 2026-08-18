import { z } from "zod";

import type {
  EmailSender,
  SmtpTransportConfiguration,
} from "./configuration";

const emailRuntimeEnvironmentSchema = z.object({
  EMAIL_SERVER_HOST: z.string().trim().min(1),
  EMAIL_SERVER_PORT: z.coerce.number().int().min(1).max(65_535),
  EMAIL_SERVER_USER: z.string().trim().min(1),
  EMAIL_SERVER_PASSWORD: z.string().min(1),
  EMAIL_ADMIN: z.email(),
});

export interface EmailRuntimeConfiguration {
  smtp: SmtpTransportConfiguration;
  sender: EmailSender;
  replyTo: string;
}

export class EnvironmentConfigurationError extends Error {
  constructor() {
    super("Email service environment variables are invalid.");
    this.name = "EnvironmentConfigurationError";
  }
}

export function getEmailRuntimeConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): EmailRuntimeConfiguration {
  const result = emailRuntimeEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new EnvironmentConfigurationError();
  }

  const secure = result.data.EMAIL_SERVER_PORT === 465;

  return {
    smtp: {
      host: result.data.EMAIL_SERVER_HOST,
      port: result.data.EMAIL_SERVER_PORT,
      secure,
      requireTls: true,
      user: result.data.EMAIL_SERVER_USER,
      password: result.data.EMAIL_SERVER_PASSWORD,
    },
    sender: {
      email: result.data.EMAIL_ADMIN,
      name: "Email Admin",
    },
    replyTo: result.data.EMAIL_ADMIN,
  };
}
