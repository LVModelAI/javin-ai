import { NextResponse } from "next/server";
import { ConsumerTable } from "../db/schema"; // adjust path
import { redis } from "../db/redis";

// const WINDOW_SECONDS = 1; // 1 second
const WINDOW_SECONDS = 60; // 1 minute

export async function enforceRateLimit(
  consumer: ConsumerTable
): Promise<NextResponse | void> {
  const { rate_limit, apiKey } = consumer;

  // this means we dont wanna rate limit the consumer
  if (rate_limit === -1) return;

  const redisKey = `ratelimit:${apiKey}`;

  const isNew = await redis.set(redisKey, 1, { nx: true, ex: WINDOW_SECONDS });

  let reqCount: number;

  if (isNew) {
    // If the key was created (i.e., first request in this window)
    reqCount = 1;
  } else {
    // Key already exists — increment the counter
    reqCount = await redis.incr(redisKey);
  }

  if (reqCount > rate_limit) {
    return new NextResponse("Rate limit exceeded", { status: 429 });
  }
}
