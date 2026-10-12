// Minimal Replicate HTTP client (no SDK): official models via /models/{owner}/{name}/predictions,
// community models via their latest version id.

const API = "https://api.replicate.com/v1";

function headers(extra: Record<string, string> = {}) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: string | null;
  urls: { get: string };
}

async function waitFor(p: Prediction, deadlineMs: number): Promise<Prediction> {
  let cur = p;
  while (cur.status === "starting" || cur.status === "processing") {
    if (Date.now() > deadlineMs) throw new Error(`Replicate prediction ${cur.id} still ${cur.status} at deadline.`);
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(cur.urls.get, { headers: headers() });
    if (!res.ok) throw new Error(`Replicate poll ${res.status}: ${await res.text()}`);
    cur = (await res.json()) as Prediction;
  }
  if (cur.status !== "succeeded") throw new Error(`Replicate ${cur.status}: ${cur.error ?? "no error message"}`);
  return cur;
}

export async function runOfficial(model: string, input: Record<string, unknown>, timeoutMs = 240_000): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  const res = await fetch(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: headers({ Prefer: "wait=55" }),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Replicate ${model} ${res.status}: ${await res.text()}`);
  return (await waitFor((await res.json()) as Prediction, deadline)).output;
}

export async function runCommunity(model: string, input: Record<string, unknown>, timeoutMs = 280_000): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  const meta = await fetch(`${API}/models/${model}`, { headers: headers() });
  if (!meta.ok) throw new Error(`Replicate model lookup ${model} ${meta.status}: ${await meta.text()}`);
  const version = ((await meta.json()) as { latest_version?: { id: string } }).latest_version?.id;
  if (!version) throw new Error(`Replicate model ${model} has no latest_version.`);
  const res = await fetch(`${API}/predictions`, {
    method: "POST",
    headers: headers({ Prefer: "wait=55" }),
    body: JSON.stringify({ version, input }),
  });
  if (!res.ok) throw new Error(`Replicate ${model} ${res.status}: ${await res.text()}`);
  return (await waitFor((await res.json()) as Prediction, deadline)).output;
}
