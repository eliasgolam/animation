#!/usr/bin/env node
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const DEEP = args.has("--deep");
const FAST = args.has("--fast") || !DEEP;

const EXCLUDE_DIRS = new Set([
  ".git","node_modules",".next",".expo",".turbo",".cache",".pnpm-store",
  "dist","build","out","coverage","android/app/build","android/build","ios/build",
]);

const BINARY_EXT = new Set([
  ".png",".jpg",".jpeg",".webp",".gif",".mp4",".mov",".avi",".mkv",".zip",".jar",
  ".apk",".aab",".ipa",".bin",".ttf",".otf",".woff",".woff2",".a",".so",".dylib"
]);

const TEXT_EXT = new Set([
  ".js",".jsx",".ts",".tsx",".json",".md",".yml",".yaml",".xml",".gradle",".pro",
  ".kt",".java",".swift",".m",".mm",".h",".c",".cpp",".cc",".hpp",
  ".css",".scss",".sass",".html",".rb",".sh",".podspec"
]);

const LANG_BY_EXT = new Map([
  [".js","JavaScript"],[".jsx","JavaScript/React"],[".ts","TypeScript"],[".tsx","TypeScript/React"],
  [".swift","Swift"],[".kt","Kotlin"],[".java","Java"],[".m","Objective-C"],[".mm","Objective-C++"],
  [".h","C/C++ header"],[".c","C"],[".cpp","C++"],[".cc","C++"],[".hpp","C++ header"],
  [".json","JSON"],[".yml","YAML"],[".yaml","YAML"],[".xml","XML"],[".gradle","Gradle"],
  [".md","Markdown"],[".html","HTML"],[".css","CSS"],[".scss","SCSS"],[".sass","SASS"],
  [".rb","Ruby"],[".sh","Shell"],[".podspec","CocoaPods"]
]);

// Indicators we search for in source files
const INDICATORS = [
  {key:"skia", rx:/\bskia\b/i},
  {key:"skottie", rx:/\bskottie\b/i},
  {key:"rn_skia_pkg", rx:/@shopify\/react-native-skia/i},
  {key:"lottie", rx:/\blottie(-react-native)?\b/i},
  {key:"rive", rx:/\brive(-react-native)?\b/i},
  {key:"rn", rx:/\breact-native\b/i},
  {key:"expo", rx:/\bexpo\b/i},
  {key:"reanimated", rx:/react-native-reanimated/i},
  {key:"rn_svg", rx:/react-native-svg\b/i},
  {key:"canvas", rx:/\bcanvas\b/i},
  {key:"pdf_js", rx:/pdf\.js|react-pdf|pdfkit/i},
  {key:"swiftui", rx:/\bSwiftUI\b/},
  {key:"uikit", rx:/\bUIKit\b/},
  {key:"coreanimation", rx:/\bCoreAnimation\b|\bCABasicAnimation\b|\bCAKeyframeAnimation\b/i},
  {key:"metal", rx:/\bMetal\b/},
];

const assets = {
  svg: [],
  pdf: [],
};

const findings = {
  filesScanned: 0,
  textFilesScanned: 0,
  bytesScanned: 0,
  languages: {}, // { lang: {files, loc} }
  indicators: Object.fromEntries(INDICATORS.map(i => [i.key, []])),
  swiftFiles: [],
  androidFiles: [],
  iosSignals: { podfile:false, xcodeproj:false, xcworkspace:false },
  androidSignals: { gradle:false, settingsGradle:false },
  packageJson: null,
  deps: {},
  devDeps: {},
  repo: { remote:null, branch:null, lastCommit:null },
};

function isExcludedDir(dirPath) {
  const rel = path.relative(ROOT, dirPath);
  if (!rel) return false;
  const parts = rel.split(path.sep);
  return parts.some(p => EXCLUDE_DIRS.has(p));
}

async function* walk(dir) {
  if (isExcludedDir(dir)) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function extnameSafe(p) {
  const e = path.extname(p).toLowerCase();
  if (!e && p.toLowerCase().endsWith("podfile")) return ".podspec"; // mark as pods-ish
  return e;
}

function addLangStat(ext, lines=0) {
  const lang = LANG_BY_EXT.get(ext) || (ext ? ext : "other");
  if (!findings.languages[lang]) findings.languages[lang] = { files:0, loc:0 };
  findings.languages[lang].files++;
  findings.languages[lang].loc += lines;
}

function addIndicatorHit(key, file, lineNum, line) {
  findings.indicators[key].push({ file: path.relative(ROOT, file), line: lineNum, snippet: line.trim().slice(0,300) });
}

function recordPlatformSignals(file) {
  const rel = path.relative(ROOT, file).replaceAll("\\","/");
  if (rel.startsWith("ios/")) {
    if (rel.endsWith("Podfile")) findings.iosSignals.podfile = true;
    if (rel.endsWith(".xcodeproj/project.pbxproj")) findings.iosSignals.xcodeproj = true;
    if (rel.endsWith(".xcworkspace/contents.xcworkspacedata")) findings.iosSignals.xcworkspace = true;
  }
  if (rel.startsWith("android/")) {
    if (rel.endsWith("build.gradle") || rel.endsWith("build.gradle.kts")) findings.androidSignals.gradle = true;
    if (rel.endsWith("settings.gradle") || rel.endsWith("settings.gradle.kts")) findings.androidSignals.settingsGradle = true;
  }
}

function safeRead(p) {
  try { return fs.readFileSync(p, "utf8"); } catch { return null; }
}

function countLines(text) {
  if (!text) return 0;
  // normalize newlines and count
  return text.split(/\r\n|\n|\r/).length;
}

function detectPackageJson() {
  const pj = path.join(ROOT, "package.json");
  if (fs.existsSync(pj)) {
    try {
      const raw = fs.readFileSync(pj, "utf8");
      const json = JSON.parse(raw);
      findings.packageJson = json;
      findings.deps = json.dependencies || {};
      findings.devDeps = json.devDependencies || {};
    } catch {}
  }
}

function detectGitMeta() {
  const run = (cmd) => {
    try { return execSync(cmd, { stdio:["ignore","pipe","ignore"] }).toString().trim(); }
    catch { return null; }
  };
  findings.repo.remote = run("git config --get remote.origin.url");
  findings.repo.branch = run("git rev-parse --abbrev-ref HEAD");
  const lastHash = run("git rev-parse --short HEAD");
  const lastMsg = run("git log -1 --pretty=%s");
  const lastDate = run("git log -1 --date=iso --pretty=%cd");
  if (lastHash) findings.repo.lastCommit = `${lastHash} — ${lastMsg || ""} (${lastDate || ""})`.trim();
}

async function scan() {
  detectPackageJson();
  detectGitMeta();

  for await (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file);
    // Skip our own outputs
    if (rel === "REPORT.md" || rel === "tools/audit.mjs" || rel === "audit.json") continue;
    const ext = extnameSafe(file);
    const stat = fs.statSync(file);
    findings.filesScanned++;
    findings.bytesScanned += stat.size;
    recordPlatformSignals(file);

    if (ext === ".svg") assets.svg.push(rel);
    if (ext === ".pdf") assets.pdf.push(rel);

    if (BINARY_EXT.has(ext)) { addLangStat(ext, 0); continue; }
    if (TEXT_EXT.has(ext)) {
      if (ext === ".swift") findings.swiftFiles.push(rel);
      if (ext === ".kt" || ext === ".java" || rel.startsWith("android/")) findings.androidFiles.push(rel);
      let content = null;
      if (!FAST && stat.size <= 2_000_000) {
        content = safeRead(file);
      } else if (FAST && stat.size <= 256_000) {
        content = safeRead(file);
      }
      let loc = 0;
      if (content) {
        findings.textFilesScanned++;
        loc = countLines(content);
        // look for indicators line-by-line (limit per file)
        const lines = content.split(/\r\n|\n|\r/);
        const maxHitsPerKeyPerFile = 2;
        const perKeyCount = Object.fromEntries(INDICATORS.map(i=>[i.key,0]));
        for (let i=0;i<lines.length;i++){
          const ln = lines[i];
          for (const ind of INDICATORS) {
            if (perKeyCount[ind.key] >= maxHitsPerKeyPerFile) continue;
            if (ind.rx.test(ln)) {
              addIndicatorHit(ind.key, file, i+1, ln);
              perKeyCount[ind.key]++;
            }
          }
        }
      }
      addLangStat(ext, loc);
    } else {
      // unknown ext → treat as other text if small
      let content = null;
      if (!FAST && stat.size <= 128_000) content = safeRead(file);
      addLangStat(ext, content ? countLines(content) : 0);
    }
  }
}

function inferApproaches() {
  const d = findings.deps;
  const dd = findings.devDeps;
  const hasRN = !!(d["react-native"] || dd["react-native"] || findings.indicators["rn"].length);
  const hasExpo = !!(d["expo"] || findings.indicators["expo"].length);
  const hasRNSkia = !!(d["@shopify/react-native-skia"] || findings.indicators["rn_skia_pkg"].length || findings.indicators["skia"].length || findings.indicators["skottie"].length);
  const hasLottie = !!(d["lottie-react-native"] || d["lottie"] || findings.indicators["lottie"].length);
  const hasRive = !!(d["@rive-app/react-native"] || d["rive-react-native"] || findings.indicators["rive"].length);
  const hasRNSVG = !!(d["react-native-svg"] || findings.indicators["rn_svg"].length);
  const hasPDF = !!(findings.indicators["pdf_js"].length || assets.pdf.length);
  const hasSwiftOnlySignals = findings.swiftFiles.length > 0 || findings.iosSignals.xcodeproj || findings.iosSignals.xcworkspace || findings.iosSignals.podfile;
  const hasAndroidSignals = findings.androidSignals.gradle || findings.androidSignals.settingsGradle || findings.androidFiles.length>0;

  // Heuristics for "approaches"
  const approaches = [];
  if (hasRNSkia) approaches.push("A) Skia/Skottie-basiert (React Native Skia o. ä.)");
  if (hasRNSVG || assets.svg.length) approaches.push("B) Komposition aus SVG/PDF (react-native-svg / PDF-Libs)");
  if (hasLottie) approaches.push("C) Lottie-basiert");
  if (hasRive) approaches.push("D) Rive-basiert");
  if (hasSwiftOnlySignals && !hasRN && !hasAndroidSignals) approaches.push("E) Swift-only (iOS-spezifisch)");

  return {
    hasRN, hasExpo, hasRNSkia, hasLottie, hasRive, hasRNSVG, hasPDF, hasSwiftOnlySignals, hasAndroidSignals, approaches
  };
}

function fmtTable(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const thead = `| ${headers.join(" | ")} |\n| ${headers.map(()=>":--").join(" | ")} |`;
  const body = rows.map(r => `| ${headers.map(h => String(r[h] ?? "")).join(" | ")} |`).join("\n");
  return thead + "\n" + body + "\n";
}

async function writeOutputs() {
  const info = inferApproaches();
  const report = [];
  report.push(`# Animation & Workspace Audit`);
  report.push("");
  report.push(`**Zeitpunkt:** ${new Date().toISOString()}  \n**Host:** ${os.hostname()} (${os.platform()} ${os.release()})`);
  report.push("");
  report.push(`## Repository`);
  report.push(`- Remote: ${findings.repo.remote ?? "—"}`);
  report.push(`- Branch: ${findings.repo.branch ?? "—"}`);
  report.push(`- Letzter Commit: ${findings.repo.lastCommit ?? "—"}`);
  report.push("");
  report.push(`## Identifizierte Ansätze (Heuristik)`);
  report.push(info.approaches.length ? info.approaches.map(a=>`- ${a}`).join("\n") : "- (keine klaren Ansätze erkannt)");
  report.push("");
  report.push(`### Plattform-Signale`);
  report.push(`- React Native: ${info.hasRN ? "JA" : "nein"}`);
  report.push(`- Expo: ${info.hasExpo ? "JA" : "nein"}`);
  report.push(`- iOS/Swift-Signale: ${findings.swiftFiles.length} Swift-Dateien, Podfile: ${findings.iosSignals.podfile}, .xcodeproj: ${findings.iosSignals.xcodeproj}, .xcworkspace: ${findings.iosSignals.xcworkspace}`);
  report.push(`- Android-Signale: Gradle: ${findings.androidSignals.gradle}, settings.gradle: ${findings.androidSignals.settingsGradle}, Android-Quellen: ${findings.androidFiles.length}`);
  report.push("");
  report.push(`## Sprachen (Dateien & Zeilen)`);
  const langRows = Object.entries(findings.languages)
    .map(([lang,stat]) => ({ Sprache: lang, Dateien: stat.files, "Zeilen (rough)": stat.loc }));
  report.push(fmtTable(langRows));
  report.push("");
  if (findings.packageJson) {
    report.push(`## package.json (Auszug)`);
    const deps = Object.keys(findings.deps).length ? Object.keys(findings.deps).sort() : [];
    const dev = Object.keys(findings.devDeps).length ? Object.keys(findings.devDeps).sort() : [];
    report.push(`**Dependencies (${deps.length}):** ${deps.join(", ") || "—"}`);
    report.push(`**DevDependencies (${dev.length}):** ${dev.join(", ") || "—"}`);
    report.push("");
  }
  report.push(`## Assets`);
  report.push(`- SVG: ${assets.svg.length}`);
  report.push(`- PDF: ${assets.pdf.length}`);
  if (assets.svg.length) {
    report.push(`<details><summary>SVG-Dateien (Top 20)</summary>`);
    report.push("");
    report.push(assets.svg.slice(0,20).map(p=>`- ${p}`).join("\n"));
    if (assets.svg.length>20) report.push(`- … (${assets.svg.length-20} weitere)`);
    report.push("</details>");
  }
  if (assets.pdf.length) {
    report.push(`<details><summary>PDF-Dateien (Top 20)</summary>`);
    report.push("");
    report.push(assets.pdf.slice(0,20).map(p=>`- ${p}`).join("\n"));
    if (assets.pdf.length>20) report.push(`- … (${assets.pdf.length-20} weitere)`);
    report.push("</details>");
  }
  report.push("");
  report.push(`## Indikator-Treffer (Belege)`);
  for (const ind of INDICATORS) {
    const list = findings.indicators[ind.key];
    report.push(`### ${ind.key}`);
    if (!list.length) { report.push("- —"); continue; }
    const rows = list.slice(0,40).map(h => ({ Datei: h.file, Zeile: h.line, Snippet: "`"+h.snippet.replaceAll("|","\\|")+"`" }));
    report.push(fmtTable(rows));
    if (list.length>40) report.push(`- … (${list.length-40} weitere Treffer)`);
    report.push("");
  }
  if (findings.swiftFiles.length) {
    report.push(`## Swift-Dateien (Auszug)`);
    report.push(findings.swiftFiles.slice(0,30).map(p=>`- ${p}`).join("\n"));
    if (findings.swiftFiles.length>30) report.push(`- … (${findings.swiftFiles.length-30} weitere)`);
    report.push("");
  }
  if (findings.androidFiles.length) {
    report.push(`## Android-Quellen (Auszug)`);
    report.push(findings.androidFiles.slice(0,30).map(p=>`- ${p}`).join("\n"));
    if (findings.androidFiles.length>30) report.push(`- … (${findings.androidFiles.length-30} weitere)`);
    report.push("");
  }
  report.push(`## Scan-Statistik`);
  report.push(`- Dateien gesamt: ${findings.filesScanned}`);
  report.push(`- Textdateien gescannt: ${findings.textFilesScanned}`);
  report.push(`- Datenmenge gelesen: ${(findings.bytesScanned/1_000_000).toFixed(2)} MB`);
  report.push(`- Modus: ${DEEP ? "DEEP (Inhaltsscans bis 2MB)" : "FAST (nur kleine Dateien; Metadaten)"}`);
  report.push("");
  report.push(`---`);
  report.push(`### Interpretation (automatisch, heuristisch)`);
  const msg = [];
  if (info.approaches.length >= 2) {
    msg.push(`Es existieren **mehrere Animationsansätze** parallel: ${info.approaches.join(", ")}.`);
  } else if (info.approaches.length === 1) {
    msg.push(`Aktuell dominiert **ein Ansatz**: ${info.approaches[0]}.`);
  } else {
    msg.push(`Kein klarer Animationsansatz identifizierbar (weitere manuelle Prüfung empfohlen).`);
  }
  if (info.hasSwiftOnlySignals && info.hasRN) {
    msg.push(`Sowohl **Swift/iOS-spezifische** Artefakte als auch **React Native** Signale vorhanden → mögliche Doppelspurigkeit.`);
  }
  if (info.hasRNSVG && assets.svg.length) {
    msg.push(`Viele **SVG-Assets** → Kompositionspfad plausibel (Icons/Shapes für Siri-ähnliche Wellen).`);
  }
  if (info.hasRNSkia) {
    msg.push(`**Skia** erkannt → performante Canvas-Pfade für Echtzeit-Wellenformen realistisch.`);
  }
  if (info.hasPDF) {
    msg.push(`**PDF-Artefakte** vorhanden → prüfen, ob das wirklich für Animation nötig ist (PDF ist selten ideal für Frame-exakte Wave-Animationen).`);
  }
  report.push(msg.map(s=>"* "+s).join("\n"));
  report.push("");

  await fsp.writeFile(path.join(ROOT, "REPORT.md"), report.join("\n"), "utf8");
  await fsp.writeFile(path.join(ROOT, "audit.json"), JSON.stringify({ findings, assets, summary: inferApproaches() }, null, 2), "utf8");
  console.log("✔ REPORT.md & audit.json erzeugt.");
}

(async () => {
  await scan();
  await writeOutputs();
})();

