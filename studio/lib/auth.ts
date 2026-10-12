export const AUTH_COOKIE = "dana_studio_auth";

export async function authToken(): Promise<string> {
  const pw = process.env.STUDIO_PASSWORD;
  if (!pw) throw new Error("Missing STUDIO_PASSWORD.");
  const data = new TextEncoder().encode(`${pw}:dana-chen-studio`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
