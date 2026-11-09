import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {mean,csv} from "../src/math.ts";
import {pixels,contains,eligible} from "../src/satellite.ts";

const payload=readFileSync(new URL("../src/fixtures.json",import.meta.url));
const fixture=JSON.parse(payload);
const provenance=JSON.parse(readFileSync(new URL("../src/provenance.json",import.meta.url)));
test("public fixture hash and S01 experimental design",()=>{
  assert.equal(createHash("sha256").update(payload).digest("hex"),provenance.payload_sha256);
  assert.equal(fixture.synthetic,true);
  assert.equal(new Set(fixture.plots.map(p=>p.id)).size,24);
  assert.equal(new Set(fixture.plots.map(p=>[p.block,p.genotype,p.treatment].join())).size,24);
  assert.equal(new Set(fixture.plots.map(p=>p.block)).size,4);
  assert.equal(new Set(fixture.plots.map(p=>p.genotype)).size,2);
  assert.equal(new Set(fixture.plots.map(p=>p.treatment)).size,3);
  assert.equal(fixture.observations.length,1920);
  assert.equal(fixture.observations.filter(o=>o.value===null&&o.missing).length,7);
  for(const p of fixture.plots){
    assert(p.ring.every(([x,y])=>x>=0&&x<=128&&y>=0&&y<=88.5));
    assert.deepEqual(p.ring[0],p.ring.at(-1));
  }
});
test("known UAV reference means and four complete acquisitions",()=>{
  assert.deepEqual(fixture.dates,["2024-05-15","2024-07-15","2025-05-15","2025-07-15"]);
  assert.equal(fixture.uav.length,288);
  for(const date of fixture.dates) for(const index of ["NDVI","NDRE","Mixed temperature"]){
    const records=fixture.uav.filter(r=>r.date===date&&r.index===index);
    assert.equal(new Set(records.map(r=>r.plot)).size,24);
    assert(records.every(r=>r.valid<=r.total&&Number.isFinite(r.value)));
  }
  const first=fixture.uav.filter(r=>r.plot===fixture.plots[0].id&&r.date===fixture.dates[0]);
  assert(Math.abs(first.find(r=>r.index==="NDVI").value-.502616)<1e-6);
  assert(Math.abs(first.find(r=>r.index==="Mixed temperature").value-30.20135)<2e-5);
});
test("illustrative native grids produce sparse or masked plot observations",()=>{
  for(const [index,size] of [["NDVI",10],["NDRE",20]]){
    const grid=pixels(3,index);
    assert(grid.every(c=>c.resolution===size));
    assert(grid.some(c=>!eligible(c.classification)));
    assert(fixture.plots.some(p=>!grid.some(c=>contains(p.ring,c.cx,c.cy)&&eligible(c.classification))));
  }
  assert(!eligible(0));
  assert(!eligible(3));
});
test("empty means and CSV missing fields stay missing",()=>{
  assert.equal(mean([]),null);
  assert.equal(mean([2,3]),2.5);
  assert.equal(csv([[null,'a,"b"']]),'"","a,""b"""\r\n');
});
