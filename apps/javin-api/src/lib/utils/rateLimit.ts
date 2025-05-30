import { NextResponse } from "next/server";
import { ConsumerTable } from "../db/schema"; // adjust path
import { redis } from "../db/redis";

// const WINDOW_SECONDS = 1; // 1 second
// const WINDOW_SECONDS = 60; // 1 minute
const WINDOW_SECONDS = 86400; // 1 day

export async function enforceRateLimit(
  consumer: ConsumerTable
): Promise<NextResponse | void> {
  const { rate_limit, apiKey } = consumer;

  // this means we dont wanna rate limit the consumer
  if (rate_limit === -1) return;

  const redisKey = `ratelimit:${apiKey}`;

  let reqCount: number;

  const exists = await redis.exists(redisKey);
  
  if (!exists) {
    // create a new key with an initial count of 1
    await redis.set(redisKey, 1, { ex: WINDOW_SECONDS });
    reqCount = 1;
  } else {
    // increment the existing key
    reqCount = await redis.incr(redisKey);
  }

  if (reqCount > rate_limit) {
    return new NextResponse("Rate limit exceeded", { status: 429 });
  }
}
