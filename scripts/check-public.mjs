import assert from "node:assert/strict";
import {readdirSync,readFileSync,statSync} from "node:fs";
import {join} from "node:path";

const allow=new Set([
  ".gitattributes",".gitignore",".github/workflows/pages.yml","README.md","index.html",
  "package.json","package-lock.json","tsconfig.json","vite.config.js","playwright.config.ts",
  "scripts/check-public.mjs","scripts/export-fixtures.py","src/fixtures.json","src/provenance.json",
  "src/main.ts","src/math.ts","src/satellite.ts","src/style.css","tests/data.test.mjs","tests/demo.spec.ts",
]);
function files(path,skip=[]){
  return readdirSync(path,{withFileTypes:true}).flatMap(entry=>{
    if(skip.includes(entry.name))return [];
    assert(!entry.isSymbolicLink(), "Unexpected symlink "+join(path,entry.name));
    const next=join(path,entry.name);
    return entry.isDirectory()?files(next):[next.replaceAll("\\","/")];
  });
}
const source=files(".",[".git","node_modules","dist","test-results","playwright-report"]);
assert.deepEqual(new Set(source),allow);
const secret=/-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[0-9a-zA-Z]{30,}|github_pat_[0-9a-zA-Z_]{30,}|AKIA[A-Z0-9]{16}|(?:postgres(?:ql)?|mysql):\/\/[^\s]+:[^\s]+@/;
for(const path of source){
  assert(statSync(path).size<2_000_000,path);
  assert(!secret.test(readFileSync(path,"utf8")), "Potential secret in "+path);
}
const built=files("dist");
assert(built.every(path=>/^dist\/(?:index\.html|assets\/[\w.-]+\.(?:css|js))$/.test(path)),built);
const html=readFileSync("dist/index.html","utf8");
const assets=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
assert(assets.length>=2);
const base = process.env.DEMO_LEGACY_PAGES === "1" ? "/NatureWISE-demo/" : "/";
for (const asset of assets) {
  assert(asset.startsWith(base + "assets/"), asset);
  assert(built.includes("dist/" + asset.slice(base.length)), asset);
}
for (const path of built) {
  const content = readFileSync(path, "utf8");
  assert(!secret.test(content), "Potential secret in " + path);
  assert(!/sourceMappingURL\s*=/.test(content), "Source map reference in " + path);
  assert(!/github\.com\/rmp2693-arch\/NatureWISE-demo/i.test(content), "Source repository link in " + path);
}
const js=built.filter(path=>path.endsWith(".js")).map(path=>readFileSync(path,"utf8")).join("\n");
for(const copy of ["PUBLIC DEMO · SYNTHETIC DATA","Illustrative synthetic scenes","full application","Mixed canopy-and-ground temperature"])assert(js.includes(copy),copy);
assert(!/(?:fetch\(|XMLHttpRequest|\/api\/auth)/.test(js.replace(/fetch\(e\.href,\w+\)/g,"")), "Unexpected runtime request");
console.log("Reviewed source allowlist, credential patterns, static asset paths and scientific disclosures passed.");
