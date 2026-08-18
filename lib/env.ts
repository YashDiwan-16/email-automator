import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  RESEND_API_KEY: z
    .string()
    .min(1)
    .regex(/^re_/u),
  RESEND_FROM_EMAIL: z.email(),
  EMAIL_AUTOMATOR_ACCESS_TOKEN: z.string().min(32).max(256),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export class EnvironmentConfigurationError extends Error {
  constructor() {
    super("Email service environment variables are invalid.");
    this.name = "EnvironmentConfigurationError";
  }
}

export function getServerEnvironment(): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse({
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    EMAIL_AUTOMATOR_ACCESS_TOKEN:
      process.env.EMAIL_AUTOMATOR_ACCESS_TOKEN,
  });

  if (!result.success) {
    throw new EnvironmentConfigurationError();
  }

  return result.data;
}
