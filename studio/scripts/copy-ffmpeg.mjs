// Copies the @ffmpeg/ffmpeg ESM build into /public so its module worker is served same-origin
// (bundlers cannot resolve its dynamic `new Worker(new URL(...))`).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm");
if (!existsSync(src)) throw new Error(`@ffmpeg/ffmpeg not installed at ${src}`);
const dest = join(process.cwd(), "public", "ffmpeg");
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true, filter: (p) => !p.endsWith(".d.ts") && !p.endsWith(".d.mts") });
console.log(`copied @ffmpeg/ffmpeg esm -> ${dest}`);
