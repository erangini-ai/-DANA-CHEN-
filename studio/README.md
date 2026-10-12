# DANA CHEN · Studio

סטודיו תוכן עצמאי לקליניקה של דנה חן, בלי Higgsfield. Next.js 16 על Vercel.

## מודולים

| מודול | נתיב | מנוע |
|---|---|---|
| מוח מרכזי | `/brain` | ייבוא `products.json` (רשימה) + `data/brand.json` + הערות מחקר |
| מעבדת תוכן | `/lab` | 7 סוכני Claude + משכתבת, Loop Engineering עד 3 סבבים, ציון ביטחון |
| ספריית תוכן | `/library` | פסיקת GO / REVIEW / BLOCK, צירוף מדיה, `reel.json` ל-Remotion, תזמון |
| מדיה | `/media` | העלאה ל-Vercel Blob, הרחבה ב-Bria Expand (מוצר/B-roll בלבד), ריפוד קרם ללא AI |
| וידאו | `/video` | ffmpeg.wasm בדפדפן: חיתוך, 1080×1920, השתקה |
| אודיו | `/audio` | Demucs (Replicate) להסרת קול, חיבור מחדש בלי קידוד וידאו |
| סורק השראה | `/scraper` | cheerio + סוכן ניתוח, נשמר במוח המרכזי |
| חדר מלחמה | `/warroom` | Claude + web search על שינויי אלגוריתם, עם מקורות |
| ניטור מותג | `/monitor` | שאילתות למנועי AI, אחוז אזכור "דנה חן" |
| תזמון | `/schedule` | Upstash Redis + Vercel Cron → Make webhook |

## כללים קשיחים (בקוד, לא תזכורות)

- `lib/compliance.ts` + `lib/rules.ts`: שער מוצר (COMPLETE בלבד, PHOENIX/TRANQUILO חסומים) ובדיקת קופי (רפואי, ריפוי, הבטחות, לפני/אחרי, מחירי טיפולים, ציטוט בפי דנה, CTA, SPF).
- הבדיקה רצה בכל שלב: בלולאת המעבדה, שוב בשרת בשמירה, ושוב לפני כל פרסום.
- `assertNotDana`: נכס מסוג `dana` לא נשלח לשום מודל גנרטיבי. רק ריפוד קרם בקנבס.
- `npm test` מריץ 12 בדיקות על הכללים, כולל שתי ההפרות האמיתיות מהמפעל.

## פריסה מהאייפון

1. vercel.com → Add New → Project → `erangini-ai/-DANA-CHEN-`, branch `claude/dana-studio`, **Root Directory: `studio`**.
2. Storage → Create → **Blob** (מוסיף `BLOB_READ_WRITE_TOKEN`) ו-**Upstash Redis** מה-Marketplace (מוסיף `KV_REST_API_URL`/`KV_REST_API_TOKEN`).
3. Settings → Environment Variables: `STUDIO_PASSWORD`, `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`, `CRON_SECRET`, ואופציונלית `MAKE_WEBHOOK_URL`, `ANTHROPIC_MODEL` (ברירת מחדל `claude-sonnet-5-5`), `MONITOR_PROVIDERS`.
4. Redeploy. כניסה עם `STUDIO_PASSWORD`, ואז מוח מרכזי → ייבוא `products.json`.

## Make

תרחיש חדש: **Webhooks → Custom webhook** → העתק את ה-URL ל-`MAKE_WEBHOOK_URL`.
המטען שנשלח: `schedule_id, piece_id, platform, product, headline, caption, media_url, media_type, whatsapp_url, publish_at`.
מהטריגר ממשיכים ל-Instagram/Facebook/TikTok לפי `platform`.

## ניטור מנועים נוספים

`MONITOR_PROVIDERS` מקבל JSON של ספקים עם endpoint תואם OpenAI (`POST {baseUrl}/chat/completions`).
`apiKeyEnv` הוא שם משתנה הסביבה שמחזיק את המפתח. דוגמה (שם המודל לפי הספק שלך):

```json
[{"name":"openai","baseUrl":"https://api.openai.com/v1","apiKeyEnv":"OPENAI_API_KEY","model":"<model id from your OpenAI account>"}]
```

בלי הגדרה, הניטור רץ על Claude עם web search בלבד.

## פיתוח

```bash
npm install          # postinstall מעתיק את ffmpeg ל-public/ffmpeg
cp .env.example .env.local
npm run dev
npm test && npm run typecheck && npm run build
```
