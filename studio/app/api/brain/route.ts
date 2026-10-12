import { NextResponse } from "next/server";
import { brand, getNotes, getProducts, getProductsMeta, importProducts, productStatus } from "@/lib/brain";

export const dynamic = "force-dynamic";

export async function GET() {
  const [products, meta, notes] = await Promise.all([getProducts(), getProductsMeta(), getNotes()]);
  return NextResponse.json({ brand, meta, notes, products: products.map(productStatus) });
}

// Body: the parsed products.json content + its file name.
export async function POST(req: Request) {
  const { json, sourceName } = (await req.json()) as { json: unknown; sourceName?: string };
  try {
    const meta = await importProducts(json, sourceName ?? "products.json");
    const products = (await getProducts()).map(productStatus);
    return NextResponse.json({ meta, products });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
