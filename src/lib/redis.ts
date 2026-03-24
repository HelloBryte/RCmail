import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

export function getRedis() {
	if (redisInstance) return redisInstance;

	if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
		throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required");
	}

	redisInstance = Redis.fromEnv();
	return redisInstance;
}
