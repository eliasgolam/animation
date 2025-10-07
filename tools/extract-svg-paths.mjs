import path from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const SRC_DIR = path.resolve("assets");
const OUT_FILE = path.resolve("xplat-siri/src/spec/paths.generated.ts");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  trimValues: true,
});

function keyFromName(name){ return name.replace(/\.svg$/i,"").replace(/[^a-z0-9_]+/gi,"_"); }
const tn = (tag) => String(tag||"").toLowerCase().split(":").pop();
const ga = (node, name, def=null) => (node?.[`@_${name}`] ?? def);
const num = (v, d=0) => { if (v==null||v==="") return d; const n=parseFloat(String(v).replace(/[^0-9eE+\-\.]/g,"")); return Number.isFinite(n)?n:d; };
const parsePoints = (str) => { const arr=String(str||"").trim().replace(/,/g," ").split(/\s+/).map(Number); const pts=[]; for(let i=0;i+1<arr.length;i+=2) pts.push([arr[i],arr[i+1]]); return pts; };

function rectToPath(n){
  const x=num(ga(n,'x',0)), y=num(ga(n,'y',0)), w=num(ga(n,'width',0)), h=num(ga(n,'height',0));
  let rx=ga(n,'rx',null), ry=ga(n,'ry',null); rx = rx==null?0:num(rx,0); ry = ry==null?rx:num(ry,0);
  if (w<=0||h<=0) return "";
  if (!rx&&!ry) return `M ${x} ${y} H ${x+w} V ${y+h} H ${x} Z`;
  rx=Math.min(rx,w/2); ry=Math.min(ry,h/2);
  return [
    `M ${x+rx} ${y}`, `H ${x+w-rx}`, `A ${rx} ${ry} 0 0 1 ${x+w} ${y+ry}`,
    `V ${y+h-ry}`, `A ${rx} ${ry} 0 0 1 ${x+w-rx} ${y+h}`,
    `H ${x+rx}`, `A ${rx} ${ry} 0 0 1 ${x} ${y+h-ry}`,
    `V ${y+ry}`, `A ${rx} ${ry} 0 0 1 ${x+rx} ${y}`, `Z`
  ].join(" ");
}
function circleToPath(n){
  const cx=num(ga(n,'cx',0)), cy=num(ga(n,'cy',0)), r=num(ga(n,'r',0));
  if (r<=0) return ""; return `M ${cx-r} ${cy} A ${r} ${r} 0 1 0 ${cx+r} ${cy} A ${r} ${r} 0 1 0 ${cx-r} ${cy} Z`;
}
function ellipseToPath(n){
  const cx=num(ga(n,'cx',0)), cy=num(ga(n,'cy',0)), rx=num(ga(n,'rx',0)), ry=num(ga(n,'ry',0));
  if (rx<=0||ry<=0) return ""; return `M ${cx-rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx-rx} ${cy} Z`;
}
function lineToPath(n){
  const x1=num(ga(n,'x1',0)), y1=num(ga(n,'y1',0)), x2=num(ga(n,'x2',0)), y2=num(ga(n,'y2',0));
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}
function polyToPath(n, close){
  const pts=parsePoints(ga(n,'points','')); if(!pts.length) return "";
  const start=`M ${pts[0][0]} ${pts[0][1]}`;
  const lines=pts.slice(1).map(p=>`L ${p[0]} ${p[1]}`).join(" ");
  return close? `${start} ${lines} Z` : `${start} ${lines}`;
}

function walk(node, fn){
  if (!node || typeof node!=='object') return;
  for (const [tag, child] of Object.entries(node)) {
    if (tag.startsWith("@_")) continue;
    if (tag==="#text") continue;
    const arr = Array.isArray(child)? child : [child];
    for (const el of arr) {
      if (el && typeof el==='object') {
        fn(tag, el);
        walk(el, fn);
      }
    }
  }
}

function collectAllShapes(root){
  const idMap = new Map();
  walk(root, (tag, el) => {
    const id = ga(el,'id',null); if (id) idMap.set(id, { tag: tn(tag), el });
  });

  const out = [];
  const push = (d) => { if (d && String(d).trim()) out.push(String(d).trim()); };

  walk(root, (tag, el) => {
    const t = tn(tag);
    if (t === 'path') { push(ga(el,'d','')); return; }
    if (t === 'rect') { push(rectToPath(el)); return; }
    if (t === 'circle') { push(circleToPath(el)); return; }
    if (t === 'ellipse') { push(ellipseToPath(el)); return; }
    if (t === 'line') { push(lineToPath(el)); return; }
    if (t === 'polyline') { push(polyToPath(el,false)); return; }
    if (t === 'polygon') { push(polyToPath(el,true)); return; }
    if (t === 'use') {
      const href = ga(el,'href', ga(el,'xlink:href', null));
      if (href && href.startsWith('#')) {
        const ref = idMap.get(href.slice(1));
        if (ref) {
          const rt = ref.tag, rn = ref.el;
          if (rt==='path') push(ga(rn,'d',''));
          else if (rt==='rect') push(rectToPath(rn));
          else if (rt==='circle') push(circleToPath(rn));
          else if (rt==='ellipse') push(ellipseToPath(rn));
          else if (rt==='line') push(lineToPath(rn));
          else if (rt==='polyline') push(polyToPath(rn,false));
          else if (rt==='polygon') push(polyToPath(rn,true));
        }
      }
      return;
    }
  });
  return out;
}

async function main(){
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  const map = {};
  for (const e of entries) {
    if (!e.isFile() || !/\.svg$/i.test(e.name)) continue;
    const full = path.join(SRC_DIR, e.name);
    const raw = await readFile(full, "utf8");
    const tree = parser.parse(raw);
    const shapes = collectAllShapes(tree);
    if (shapes.length) {
      map[keyFromName(e.name)] = shapes.join(" ");
      console.log("OK", e.name, "segments:", shapes.length);
    } else {
      console.warn("WARN no vector shapes found in", e.name);
    }
  }
  const header = `// AUTO-GENERATED from ${SRC_DIR.replace(/\\/g,"/")}/*.svg\n`;
  const body = `export const PATHS = ${JSON.stringify(map, null, 2)} as const;\n`;
  await writeFile(OUT_FILE, header + body, "utf8");
  console.log("Wrote", OUT_FILE, "with", Object.keys(map).length, "keys");
}

main().catch(err => { console.error(err); process.exit(1); });
