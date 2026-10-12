import Link from "next/link";
import { getProducts, getProductsMeta, productStatus } from "@/lib/brain";
import { KEYS, hAll, history } from "@/lib/store";
import type { ContentPiece, ScheduleItem } from "@/lib/types";
import { AGENTS } from "@/lib/agents";

export const dynamic = "force-dynamic";

async function load() {
  try {
    const [products, meta, pieces, schedule, war, mon] = await Promise.all([
      getProducts(),
      getProductsMeta(),
      hAll<ContentPiece>(KEYS.pieces),
      hAll<ScheduleItem & { createdAt?: string }>(KEYS.schedule),
      history<{ createdAt: string }>(KEYS.warroom, 1),
      history<{ createdAt: string; visibility: number }>(KEYS.monitor, 1),
    ]);
    return { products: products.map(productStatus), meta, pieces, schedule, war: war[0], mon: mon[0], error: null };
  } catch (e) {
    return { products: [], meta: null, pieces: [], schedule: [], war: undefined, mon: undefined, error: (e as Error).message };
  }
}

export default async function Dashboard() {
  const d = await load();
  const count = (v: string) => d.pieces.filter((p) => p.verdict === v).length;
  const upcoming = d.schedule.filter((s) => s.status === "scheduled").sort((a, b) => a.publishAt.localeCompare(b.publishAt));
  const open = d.products.filter((p) => p.gate.allowed).length;

  return (
    <>
      <div className="page-head">
        <h1>לוח בקרה</h1>
        <p>{Object.keys(AGENTS).length} סוכנים · שער רגולציה כפול · מקור אמת אחד</p>
      </div>
      {d.error && <div className="err">{d.error}</div>}

      <div className="grid">
        <Link href="/brain" className="card" style={{ textDecoration: "none" }}>
          <div className="stat">{open}/{d.products.length}</div>
          <div className="muted">מוצרים פתוחים ליצירה{d.meta ? ` · יובא ${new Date(d.meta.importedAt).toLocaleDateString("he-IL")}` : " · לא יובא"}</div>
        </Link>
        <Link href="/library" className="card" style={{ textDecoration: "none" }}>
          <div className="stat">{count("GO")}</div>
          <div className="muted">GO · {count("REVIEW")} REVIEW · {count("BLOCK")} BLOCK</div>
        </Link>
        <Link href="/schedule" className="card" style={{ textDecoration: "none" }}>
          <div className="stat">{upcoming.length}</div>
          <div className="muted">{upcoming[0] ? `הבא: ${new Date(upcoming[0].publishAt).toLocaleString("he-IL")}` : "אין פרסומים מתוזמנים"}</div>
        </Link>
        <Link href="/monitor" className="card" style={{ textDecoration: "none" }}>
          <div className="stat">{d.mon ? `${Math.round(d.mon.visibility * 100)}%` : "—"}</div>
          <div className="muted">נראות במנועי AI</div>
        </Link>
        <Link href="/warroom" className="card" style={{ textDecoration: "none" }}>
          <div className="stat" style={{ fontSize: "1.2rem" }}>{d.war ? new Date(d.war.createdAt).toLocaleDateString("he-IL") : "—"}</div>
          <div className="muted">סריקת אלגוריתמים אחרונה</div>
        </Link>
      </div>

      <section className="card">
        <h2>הסוכנים</h2>
        <ul className="steps">
          {Object.values(AGENTS).map((a) => (
            <li key={a.id}>
              <span>{a.name_he}</span>
              <span className="muted">{a.role_he}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>כללים קשיחים</h2>
        <ul>
          <li>דמות דנה: רק תמונות אמיתיות. אף תמונה שלה לא נשלחת למודל גנרטיבי, ואין ציטוטים בפיה.</li>
          <li>שפה קוסמטית בלבד: בלי רפואי, ריפוי, הבטחות, לפני/אחרי, מחירי טיפולים.</li>
          <li>CTA לוואטסאפ חובה. הערת SPF חובה במוצרי חומצה ורטינואיד.</li>
          <li>שער מוצר: רק copy_status = COMPLETE, PHOENIX ו-TRANQUILO חסומים.</li>
        </ul>
      </section>
    </>
  );
}
