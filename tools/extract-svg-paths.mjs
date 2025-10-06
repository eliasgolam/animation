#!/usr/bin/env node
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "assets");
const OUT_DIR = path.join(ROOT, "xplat-siri", "src", "spec");
const OUT_FILE = path.join(OUT_DIR, "paths.generated.ts");

async function main(){
  await fsp.mkdir(OUT_DIR, { recursive: true });
  let entries = [];
  try { entries = await fsp.readdir(SRC_DIR, { withFileTypes: true }); } catch {}
  const svgs = entries.filter(e => e.isFile() && e.name.toLowerCase().endsWith(".svg"));
  const map = {};
  for (const e of svgs){
    const full = path.join(SRC_DIR, e.name);
    const raw = await fsp.readFile(full, "utf8");
    const paths = [...raw.matchAll(/<path[^>]*\sd\s*=\s*"(.*?)"[^>]*>/gis)].map(m=>m[1]);
    if (paths[0]){
      const key = e.name.replace(/\.svg$/i,"").replace(/[^a-z0-9_]+/gi,"_");
      map[key] = paths[0];
    }
  }
  const header = `// AUTO-GENERATED from /assets/*.svg\nexport const PATHS: Record<string,string> = ${JSON.stringify(map, null, 2)} as const;\n`;
  await fsp.writeFile(OUT_FILE, header, "utf8");
  console.log(`✔ Wrote ${OUT_FILE} with ${Object.keys(map).length} paths.`);
}
main();

