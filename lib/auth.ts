import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function digestToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function isAuthorizedAccessToken(
  providedToken: string,
  expectedToken: string,
): boolean {
  return timingSafeEqual(digestToken(providedToken), digestToken(expectedToken));
}

export function createAccessIdentity(accessToken: string): string {
  return createHash("sha256").update(accessToken, "utf8").digest("hex");
}
