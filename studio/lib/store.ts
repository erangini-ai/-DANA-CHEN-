import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL/KV_REST_API_TOKEN).");
  }
  client = new Redis({ url, token, automaticDeserialization: false });
  return client;
}

export const KEYS = {
  products: "brain:products",
  productsMeta: "brain:products_meta",
  notes: "brain:notes",
  assets: "assets",
  pieces: "pieces",
  schedule: "schedule",
  warroom: "warroom",
  monitor: "monitor",
} as const;

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis().get<string>(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await redis().set(key, JSON.stringify(value));
}

export async function hPut(key: string, id: string, value: unknown): Promise<void> {
  await redis().hset(key, { [id]: JSON.stringify(value) });
}

export async function hGet<T>(key: string, id: string): Promise<T | null> {
  const raw = await redis().hget<string>(key, id);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function hAll<T extends { createdAt?: string }>(key: string): Promise<T[]> {
  // With automaticDeserialization: false, HGETALL comes back as the raw flat [field, value, ...] array.
  const raw = (await redis().hgetall(key)) as unknown;
  const values: string[] = Array.isArray(raw)
    ? raw.filter((_, i) => i % 2 === 1).map(String)
    : Object.values((raw ?? {}) as Record<string, string>);
  return values
    .map((v) => JSON.parse(v) as T)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function hDel(key: string, id: string): Promise<void> {
  await redis().hdel(key, id);
}

// Capped history lists (newest first).
export async function pushHistory(key: string, value: unknown, keep = 30): Promise<void> {
  await redis().lpush(key, JSON.stringify(value));
  await redis().ltrim(key, 0, keep - 1);
}

export async function history<T>(key: string, count = 30): Promise<T[]> {
  const raw = await redis().lrange<string>(key, 0, count - 1);
  return raw.map((r) => JSON.parse(r) as T);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
