import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

type RateLimitPolicy = "search" | "detail" | "translate";

type RateLimitResult = Awaited<ReturnType<Ratelimit["limit"]>>;

const RATE_LIMIT_PREFIX = process.env.UPSTASH_RATE_LIMIT_PREFIX?.trim() || "patent-project";
const RATE_LIMIT_ANALYTICS = process.env.UPSTASH_RATE_LIMIT_ANALYTICS === "true";
const WINDOW = "1 m" as const;
const DEFAULT_LIMITS: Record<RateLimitPolicy, number> = {
  search: readPositiveInt("UPSTASH_RATE_LIMIT_SEARCH_REQUESTS", 10),
  detail: readPositiveInt("UPSTASH_RATE_LIMIT_DETAIL_REQUESTS", 30),
  translate: readPositiveInt("UPSTASH_RATE_LIMIT_TRANSLATE_REQUESTS", 20),
};

const hasRedisCredentials = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
);

const redis = hasRedisCredentials ? Redis.fromEnv() : null;

const limiters = redis
  ? {
      search: createLimiter(redis, "search", DEFAULT_LIMITS.search),
      detail: createLimiter(redis, "detail", DEFAULT_LIMITS.detail),
      translate: createLimiter(redis, "translate", DEFAULT_LIMITS.translate),
    }
  : null;

function createLimiter(redisClient: Redis, policy: RateLimitPolicy, requests: number) {
  return new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(requests, WINDOW),
    analytics: RATE_LIMIT_ANALYTICS,
    ephemeralCache: new Map<string, number>(),
    prefix: `${RATE_LIMIT_PREFIX}:${policy}`,
  });
}

function readPositiveInt(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");

    if (firstIp?.trim()) {
      return firstIp.trim();
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

export function isRateLimitEnabled() {
  return limiters !== null;
}

export function resolveRateLimitPolicy(pathname: string): RateLimitPolicy | null {
  if (pathname === "/api/translate") {
    return "translate";
  }

  if (pathname === "/search" || pathname === "/api/patents/search") {
    return "search";
  }

  if (pathname.startsWith("/patent/") || pathname.startsWith("/api/patents/")) {
    return "detail";
  }

  return null;
}

export async function checkRateLimit(request: NextRequest, policy: RateLimitPolicy): Promise<RateLimitResult> {
  if (!limiters) {
    throw new Error("Rate limiter is not configured.");
  }

  const ip = getClientIp(request);

  return limiters[policy].limit(`${policy}:${ip}`, {
    ip,
    userAgent: request.headers.get("user-agent") || undefined,
    country: request.headers.get("x-vercel-ip-country") || undefined,
  });
}

export function getRateLimitHeaders(result: Pick<RateLimitResult, "limit" | "remaining" | "reset">) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "X-RateLimit-Reset": String(result.reset),
  };
}

export function getRetryAfterSeconds(reset: number) {
  return String(Math.max(1, Math.ceil((reset - Date.now()) / 1000)));
}
