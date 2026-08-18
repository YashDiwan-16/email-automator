interface FixedWindowRateLimiterOptions {
  maximumRequests: number;
  windowMs: number;
}

interface RateLimitBucket {
  expiresAt: number;
  requestIds: Set<string>;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly maximumRequests: number;
  private readonly windowMs: number;

  constructor({
    maximumRequests,
    windowMs,
  }: FixedWindowRateLimiterOptions) {
    if (maximumRequests < 1 || windowMs < 1) {
      throw new Error("Rate limit values must be positive.");
    }

    this.maximumRequests = maximumRequests;
    this.windowMs = windowMs;
  }

  consume(key: string, requestId: string): RateLimitDecision {
    const now = Date.now();
    this.removeExpiredBuckets(now);
    const existingBucket = this.buckets.get(key);

    if (!existingBucket) {
      this.buckets.set(key, {
        expiresAt: now + this.windowMs,
        requestIds: new Set([requestId]),
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existingBucket.requestIds.has(requestId)) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existingBucket.requestIds.size >= this.maximumRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existingBucket.expiresAt - now) / 1_000),
        ),
      };
    }

    existingBucket.requestIds.add(requestId);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private removeExpiredBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
