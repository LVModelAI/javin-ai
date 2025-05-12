import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ratelimit:${apiKey} is the key in the redis db with value as the number of requests made by the consumer in the last 60 seconds
// and ttl is 60 seconds