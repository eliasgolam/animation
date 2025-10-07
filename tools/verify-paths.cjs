/* tools/verify-paths.cjs */
const fs = require('node:fs');
const outFile = 'xplat-siri/src/spec/paths.generated.ts';
if (!fs.existsSync(outFile)) { console.log('MISSING'); process.exit(0); }
let src = fs.readFileSync(outFile,'utf8');
console.log('SIZE_BYTES', Buffer.byteLength(src));
src = src.replace(/export const PATHS\s*=\s*/,'PATHS=').replace(/\s+as const;?\s*$/m,';');
let PATHS = {};
try { eval(src); } catch(e) { console.log('EVAL_ERROR', String(e)); process.exit(1); }
const keys = Object.keys(PATHS);
console.log('KEYS_COUNT', keys.length);
console.log('KEYS_SAMPLE', keys.slice(0,10));
const empty = keys.filter(k=>!PATHS[k]||!String(PATHS[k]).trim());
console.log('EMPTY_VALUES_COUNT', empty.length, empty);
const want = ['blue_middle','blue_right','bottom_pink','green_left','green_left_1','highlight','icon_bg','Intersect','pink_left','pink_top','shadow'];
const miss = want.filter(k=>!keys.includes(k));
console.log('EXPECTED_MISSING', miss.length, miss);
const specSrc = fs.readFileSync('xplat-siri/src/spec/siri.spec.ts','utf8');
const specMiss = want.filter(k=>!specSrc.includes('PATHS["'+k+'"]'));
console.log('SPEC_REF_MISSING', specMiss.length, specMiss);



