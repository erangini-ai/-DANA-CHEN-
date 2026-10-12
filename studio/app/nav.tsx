"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "לוח בקרה"],
  ["/lab", "מעבדת תוכן"],
  ["/library", "ספריית תוכן"],
  ["/media", "מדיה"],
  ["/video", "וידאו"],
  ["/audio", "אודיו"],
  ["/brain", "מוח מרכזי"],
  ["/scraper", "סורק השראה"],
  ["/warroom", "חדר מלחמה"],
  ["/monitor", "ניטור מותג"],
  ["/schedule", "תזמון"],
] as const;

export default function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav className="nav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={(href === "/" ? path === "/" : path.startsWith(href)) ? "on" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
