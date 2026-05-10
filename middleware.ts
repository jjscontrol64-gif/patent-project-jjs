import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  getRateLimitHeaders,
  getRetryAfterSeconds,
  isRateLimitEnabled,
  resolveRateLimitPolicy,
} from "@/lib/rate-limit";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const policy = resolveRateLimitPolicy(request.nextUrl.pathname);

  if (!policy || !isRateLimitEnabled()) {
    return NextResponse.next();
  }

  const result = await checkRateLimit(request, policy);
  event.waitUntil(result.pending);

  if (!result.success) {
    return NextResponse.json(
      { message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(result),
          "Retry-After": getRetryAfterSeconds(result.reset),
        },
      },
    );
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(getRateLimitHeaders(result))) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/search/:path*", "/patent/:path*", "/api/patents/search", "/api/patents/:path*", "/api/translate"],
};
