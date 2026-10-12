import { NextResponse } from "next/server";
import { auditCreative, type AuditOptions } from "@/lib/compliance";
import { getProduct } from "@/lib/brain";

export async function POST(req: Request) {
  const { content, kind, productSlug } = (await req.json()) as {
    content: unknown;
    kind: AuditOptions["kind"];
    productSlug?: string;
  };
  const product = productSlug ? await getProduct(productSlug) : null;
  return NextResponse.json(
    auditCreative(content, { kind: kind ?? "post", productSlug: product?.slug ?? productSlug, productName: product?.name }),
  );
}
