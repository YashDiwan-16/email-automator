import "server-only";

import {
  CredentialConfigurationError,
  getCredentialConfiguration,
} from "./auth";

import {
  EnvironmentConfigurationError,
  getEmailRuntimeConfiguration,
} from "./email/runtime-config";
import {
  getSessionConfiguration,
  SessionConfigurationError,
} from "./session-token";

export { EnvironmentConfigurationError };
export { CredentialConfigurationError, SessionConfigurationError };

export function getServerEnvironment() {
  return getEmailRuntimeConfiguration(process.env);
}

export function getCredentialEnvironment() {
  return getCredentialConfiguration(process.env);
}

export function getSessionEnvironment() {
  return {
    ...getSessionConfiguration(process.env),
    secureCookies: process.env.NODE_ENV === "production",
  };
}
