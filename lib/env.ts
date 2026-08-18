import "server-only";

import {
  AuthenticationConfigurationError,
  getAuthenticationConfiguration,
} from "./auth";

import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "./email/runtime-config";

export { EnvironmentConfigurationError };
export { AuthenticationConfigurationError };

export function getServerEnvironment() {
  return getEmailRuntimeConfiguration(process.env);
}

export function getAuthenticationEnvironment() {
  return {
    ...getAuthenticationConfiguration(process.env),
    secureCookies: process.env.NODE_ENV === "production",
  };
}
