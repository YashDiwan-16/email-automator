import "server-only";

import { z } from "zod";

import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "./email/runtime-config";

export { EnvironmentConfigurationError };

export function getServerEnvironment() {
  const runtime = getEmailRuntimeConfiguration(process.env);
  const accessToken = z.string().min(32).max(256).safeParse(
    process.env.EMAIL_AUTOMATOR_ACCESS_TOKEN,
  );

  if (!accessToken.success) {
    throw new EnvironmentConfigurationError();
  }

  return {
    ...runtime,
    accessToken: accessToken.data,
  };
}
