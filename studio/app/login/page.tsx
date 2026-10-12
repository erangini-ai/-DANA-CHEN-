"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      window.location.href = next.startsWith("/") ? next : "/";
    } else {
      setErr("סיסמה שגויה");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card stack" style={{ maxWidth: 380, margin: "15vh auto 0" }}>
      <h1>כניסה לסטודיו</h1>
      <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="סיסמה" />
      {err && <div className="err">{err}</div>}
      <button disabled={busy || !pw}>כניסה</button>
    </form>
  );
}
