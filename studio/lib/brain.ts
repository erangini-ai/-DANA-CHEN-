import brand from "@/data/brand.json";
import { gateProduct, normalizeSlug } from "./compliance.ts";
import { KEYS, getJSON, history, setJSON } from "./store.ts";
import type { Product } from "./types.ts";

export { brand };
export type Brand = typeof brand;

export interface ProductsMeta {
  importedAt: string;
  count: number;
  fieldCoverage: Record<string, number>;
  sourceName: string;
}

function pickString(raw: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// products.json is a list (factory schema). A {products:[...]} wrapper is also accepted.
export function normalizeProducts(input: unknown): { products: Product[]; meta: Omit<ProductsMeta, "importedAt" | "sourceName"> } {
  const list: unknown[] = Array.isArray(input)
    ? input
    : input && typeof input === "object" && Array.isArray((input as { products?: unknown }).products)
      ? ((input as { products: unknown[] }).products)
      : [];
  if (list.length === 0) throw new Error("products.json must be a non-empty list (or {products: [...]}).");

  const coverage: Record<string, number> = {};
  const products: Product[] = list.map((item, i) => {
    if (!item || typeof item !== "object") throw new Error(`Item ${i} is not an object.`);
    const raw = item as Record<string, unknown>;
    for (const k of Object.keys(raw)) coverage[k] = (coverage[k] ?? 0) + 1;
    const name = pickString(raw, ["name", "title", "name_en", "name_he"]);
    const slugSrc = pickString(raw, ["slug", "id", "key"]) || name;
    if (!slugSrc) throw new Error(`Item ${i} has no slug/id/name.`);
    return {
      slug: normalizeSlug(slugSrc),
      name: name || slugSrc,
      copy_status: pickString(raw, ["copy_status", "status"]),
      raw,
    };
  });

  const dupes = products.map((p) => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new Error(`Duplicate slugs: ${[...new Set(dupes)].join(", ")}`);
  return { products, meta: { count: products.length, fieldCoverage: coverage } };
}

export async function getProducts(): Promise<Product[]> {
  return (await getJSON<Product[]>(KEYS.products)) ?? [];
}

export async function getProduct(slug: string): Promise<Product | null> {
  const s = normalizeSlug(slug);
  return (await getProducts()).find((p) => p.slug === s) ?? null;
}

export async function importProducts(input: unknown, sourceName: string): Promise<ProductsMeta> {
  const { products, meta } = normalizeProducts(input);
  const full: ProductsMeta = { ...meta, importedAt: new Date().toISOString(), sourceName };
  await setJSON(KEYS.products, products);
  await setJSON(KEYS.productsMeta, full);
  return full;
}

export async function getProductsMeta(): Promise<ProductsMeta | null> {
  return getJSON<ProductsMeta>(KEYS.productsMeta);
}

export function productStatus(p: Product) {
  return { slug: p.slug, name: p.name, copy_status: p.copy_status, gate: gateProduct(p) };
}

export interface Note {
  id: string;
  source: string;
  title: string;
  body: Record<string, unknown>;
  createdAt: string;
}

export async function getNotes(): Promise<Note[]> {
  return history<Note>(KEYS.notes, 50);
}

// Compact context block every agent receives.
export async function brainContext(): Promise<string> {
  const notes = (await getNotes()).slice(0, 5);
  return JSON.stringify(
    {
      brand,
      recent_research_notes: notes.map((n) => ({ source: n.source, title: n.title, summary: n.body.summary ?? null })),
    },
    null,
    1,
  );
}
