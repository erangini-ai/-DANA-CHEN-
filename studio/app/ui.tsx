"use client";
import { useCallback, useEffect, useState } from "react";
import { api, KIND_HE } from "@/lib/client";
import type { Asset, AssetKind, Verdict } from "@/lib/types";

export function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

export function Pill({ v }: { v: Verdict | string }) {
  return <span className={`pill ${v}`}>{v}</span>;
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <div className="err">{error}</div> : null;
}

export interface ProductRow {
  slug: string;
  name: string;
  copy_status: string;
  gate: { allowed: boolean; reasons: string[]; spfRequired: boolean };
}

export function useProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ products: ProductRow[] }>("/api/brain")
      .then((r) => setProducts(r.products))
      .catch((e: Error) => setError(e.message));
  }, []);
  return { products, error };
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api<{ assets: Asset[] }>("/api/assets")
      .then((r) => setAssets(r.assets))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(reload, [reload]);
  return { assets, reload, error };
}

export function AssetGrid({
  assets,
  kinds,
  selected,
  onSelect,
}: {
  assets: Asset[];
  kinds?: AssetKind[];
  selected?: string | null;
  onSelect?: (a: Asset) => void;
}) {
  const list = kinds ? assets.filter((a) => kinds.includes(a.kind)) : assets;
  if (!list.length) return <p className="muted">אין קבצים עדיין.</p>;
  return (
    <div className="thumbs">
      {list.map((a) => (
        <button type="button" key={a.id} className={`thumb ${selected === a.id ? "sel" : ""}`} onClick={() => onSelect?.(a)} title={a.name}>
          {a.contentType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt={a.name} loading="lazy" />
          ) : a.contentType.startsWith("video/") ? (
            <video src={a.url} muted playsInline preload="metadata" />
          ) : (
            <span className="muted" style={{ display: "grid", placeItems: "center", height: "100%", fontSize: ".75rem", padding: 6 }}>
              {a.name}
            </span>
          )}
          <span className="tag">{KIND_HE[a.kind]}</span>
        </button>
      ))}
    </div>
  );
}
