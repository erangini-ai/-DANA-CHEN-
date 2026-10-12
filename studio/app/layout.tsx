import type { Metadata, Viewport } from "next";
import Nav from "./nav";
import "./globals.css";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500&family=Heebo:wght@300;400;500&family=Playfair+Display:wght@400&display=swap";

export const metadata: Metadata = {
  title: "דנה חן · סטודיו",
  description: "סטודיו תוכן פנימי לקליניקה של דנה חן",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FAF8F5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <header className="top">
          <div className="top-inner">
            <div className="brandline">
              <h3 style={{ margin: 0 }}>סטודיו</h3>
              <span className="latin">DANA CHEN</span>
            </div>
            <div className="hair" />
            <Nav />
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
