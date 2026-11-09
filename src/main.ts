import data from "./fixtures.json";
import provenance from "./provenance.json";
import {acquisitions, pixels, footprint, contains, eligible, scl} from "./satellite";
import {mean,number,csv} from "./math";
import "./style.css";

const pages = [
  ["studies","Studies","M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"],
  ["phenotyping","Phenotyping","M3 18h18 M5 15l5-6 4 3 6-8 M17 4h3v3"],
  ["uav","UAV Imagery","M3 7h5 M16 7h5 M6 4v6 M18 4v6 M6 7l6 5 6-5 M9 15h6v5H9z"],
  ["satellite","Satellite / Sentinel-2","M8 8l8 8 M11 4l9 9-7 7-9-9z M2 17l5 5 M17 2l5 5"],
  ["structure","3D Structure","M12 2l9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10"],
  ["guide","User Guide","M4 3h7l1 2 1-2h7v16h-7l-1 2-1-2H4z M12 5v15"],
] as const;
const plotById = new Map(data.plots.map(plot=>[plot.id,plot]));
const treatments = [...new Set(data.plots.map(p=>p.treatment))];
const genotypes = [...new Set(data.plots.map(p=>p.genotype))];
const traits = [...new Set(data.observations.map(o=>o.trait))];
const root = document.querySelector<HTMLDivElement>("#app")!;
const state = {
  plot:data.plots[0].id, trait:"tree_crown_ndvi", treatment:"All treatments", genotype:"All genotypes",
  date:data.dates[0], uav:"NDVI", scene:0, satellite:"NDVI", mask:true, angle:36, tilt:27, pageSize:12, tablePage:0,
};
const selected = () => plotById.get(state.plot)!;
const page = () => pages.find(([id])=>id===location.hash.slice(1))?.[0] ?? "studies";
const title = (s:string) => s.replaceAll("_"," ");
const short = (s:string) => s.replace("S01_OLI_ARIDO_","").replace("OLI_","");
const esc = (s:unknown) => String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const icon = (path:string, size=20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
const symbol = icon("M12 21V9 M12 15C3 15 3 7 4 5c5 0 8 3 8 10 M12 12c0-6 3-9 8-9 1 5-1 10-8 10",29);
const dot = (kind="") => `<i class="dot ${kind}" aria-hidden="true"></i>`;
const panel = (tag:string, heading:string, body:string, extra="") => `<section class="panel ${extra}"><div class="panel-head"><span class="eyebrow">${tag}</span><h2>${heading}</h2></div>${body}</section>`;
const metric = (label:string,value:string,detail:string) => `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;
const notice = (text:string) => `<aside class="notice">${icon("M12 9v4 M12 17h.01 M12 2l10 19H2z",18)}<div>${text}</div></aside>`;
const option = (value:string, selected:string, label=value) => `<option value="${esc(value)}" ${value===selected?"selected":""}>${esc(label)}</option>`;
const select = (label:string,key:string,values:string[],current:string,display=(s:string)=>s) => `<div class="field"><label for="${key}">${label}</label><select id="${key}">${values.map(v=>option(v,current,display(v))).join("")}</select></div>`;
const plotSelect = () => select("Selected plot","plot",data.plots.map(p=>p.id),state.plot,short);
const scale = (value:number|null, min:number, max:number) => value===null ? "url(#missing)" :
  `hsl(${25+118*Math.max(0,Math.min(1,(value-min)/(max-min)))}, 39%, 53%)`;
const mapPoint = ([x,y]:number[]) => [66+x*4.55,340-y*4.55];
const points = (ring:number[][]) => ring.map(p=>mapPoint(p).join(",")).join(" ");
const map = (colors?:Map<string,number|null>, bounds=[0,1], scene?:number) => {
  const satellite = scene!==undefined;
  const grid = satellite ? pixels(scene,state.satellite) : [];
  return `<div class="map"><svg viewBox="0 -100 760 490" role="group" aria-label="Interactive synthetic S01 plot map">
  <defs><pattern id="orchard" width="17" height="16" patternUnits="userSpaceOnUse"><circle cx="5" cy="6" r="2" fill="#4a6345" opacity=".25"/></pattern>
  <pattern id="missing" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#d6d5c7"/><path d="M0 0v6" stroke="#b4b2a2" stroke-width="2"/></pattern>
  <pattern id="grid" width="51" height="51" patternUnits="userSpaceOnUse"><path d="M51 0H0V51" fill="none" stroke="#8b9374" opacity=".18"/></pattern></defs>
  <rect y="-100" width="760" height="490" fill="#e6e5ce"/><rect y="-100" width="760" height="490" fill="url(#grid)"/>
  ${Array.from({length:13},(_,i)=>`<path d="M-40 ${i*34-220} Q180 ${i*28-250} 390 ${i*29-90} T810 ${i*28-65}" fill="none" stroke="#a5aa85" stroke-width="1" opacity=".48"/>`).join("")}
  <path d="M0 373 Q240 345 450 376 T760 343" fill="none" stroke="#f9f5dc" stroke-width="11"/>
  ${satellite?`<polygon points="${points(footprint(acquisitions[scene].shift))}" fill="#a4bdc1" fill-opacity=".32" stroke="#35696e" stroke-width="2" stroke-dasharray="6 5"/>`:""}
  <polygon points="${points(data.boundary)}" fill="#dce0bc" fill-opacity=".72" stroke="#697956" stroke-width="1.8" stroke-dasharray="5 4"/>
  ${grid.map(cell=>{const [x,y]=mapPoint([cell.x,cell.y+cell.resolution]);return `<rect x="${x}" y="${y}" width="${cell.resolution*4.55}" height="${cell.resolution*4.55}" fill="${(cell.classification===0 || state.mask&&!eligible(cell.classification))?"url(#missing)":scale(cell.value,0,0.65)}" fill-opacity=".67" stroke="#506e68" stroke-width=".7"/>`;}).join("")}
  ${data.plots.map((p,i)=>{
    const [x,y]=mapPoint([mean(p.ring.slice(0,-1).map(c=>c[0]))!,mean(p.ring.slice(0,-1).map(c=>c[1]))!]);
    const active=p.id===state.plot;
    return `<g class="map-plot ${active?"chosen":""}" role="button" tabindex="0" data-plot="${p.id}" aria-label="Plot ${short(p.id)}" aria-pressed="${active}"><title>${short(p.id)} · ${esc(p.treatment)}${colors?` · ${number(colors.get(p.id)??null)}`:""}</title>
    <polygon points="${points(p.ring)}" fill="${colors?scale(colors.get(p.id)??null,bounds[0],bounds[1]):["#c9c09c","#9eb783","#789873"][treatments.indexOf(p.treatment)]}" fill-opacity="${satellite?.47:.88}" stroke="${active?"#163936":"#fbf7df"}" stroke-width="${active?3:1.5}"/>
    ${satellite?"":`<polygon points="${points(p.ring)}" fill="url(#orchard)"/>`}<text x="${x}" y="${y+4}" text-anchor="middle">${String(i+1).padStart(2,"0")}</text></g>`;
  }).join("")}
  <g transform="translate(707,-52)" fill="#173d37"><text text-anchor="middle" y="-7">N</text><path d="M0 1l-6 16 6-4 6 4z"/></g>
  <path d="M605 354v7h91v-7" fill="none" stroke="#173d37" stroke-width="2"/><text x="650" y="350" text-anchor="middle">20 m</text>
  </svg><div class="map-label">${dot()} ${satellite?"ILLUSTRATIVE ACQUISITION FOOTPRINT":"S01 / LOCAL METRE GRID"}</div></div>`;
};

function lineChart(series:{date:string;value:number|null}[], unit:string, label:string) {
  const values=series.flatMap(p=>p.value===null?[]:[p.value]);
  if(!values.length) return '<p class="empty">No valid values in this selection.</p>';
  const pad=(Math.max(...values)-Math.min(...values))*.16 || Math.max(.05,Math.abs(values[0])*.05);
  const low=Math.min(...values)-pad, high=Math.max(...values)+pad;
  const stamps=series.map(p=>Date.parse(p.date)), start=Math.min(...stamps), end=Math.max(...stamps);
  const x=(i:number)=>68+(stamps[i]-start)/(end-start||1)*525;
  const y=(value:number)=>178-(value-low)/(high-low)*142;
  const line=series.map((p,i)=>p.value===null?"":`${i===0||series[i-1].value===null?"M":"L"}${x(i)} ${y(p.value)}`).join(" ");
  return `<div class="chart"><svg viewBox="0 0 635 222" role="img" aria-label="${esc(label)}">
  ${[0,1,2,3,4].map(i=>{const value=low+(high-low)*i/4;return `<path d="M68 ${y(value)}H593" stroke="#dfded0"/><text x="59" y="${y(value)+4}" text-anchor="end">${number(value,2)}</text>`;}).join("")}
  <path d="${line}" fill="none" stroke="#2a7568" stroke-width="3"/>
  ${series.map((p,i)=>p.value===null?`<text x="${x(i)}" y="188" text-anchor="middle">×</text>`:`<circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="#2a7568" stroke="#fffdf6" stroke-width="2"><title>${p.date} · ${number(p.value)} ${esc(unit)}</title></circle>`).join("")}
  ${series.map((p,i)=>series.length>5&&i%2!==0&&i!==series.length-1?"":`<text x="${x(i)}" y="${i%2?215:205}" text-anchor="middle">${p.date}</text>`).join("")}</svg></div>`;
}
const details = (fields:[string,string][]) => `<dl class="details">${fields.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
const selectedDetails = () => details([["Plot ID",short(state.plot)],["Block",selected().block],["Genotype",selected().genotype],["Treatment",selected().treatment],["Sampling area",selected().sampleArea+" m²"]]);
const table = (headers:string[], rows:string[][]) => `<div class="table-wrap" tabindex="0" aria-label="Scrollable data table"><table><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const overview = () => `
<div class="metrics">${metric("EXPERIMENTAL PLOTS","24","4 blocks · 6 plots per block")}${metric("CORE OBSERVATIONS","1,920","Repeated sampling across two campaigns")}${metric("MISSING VALUES","7","Retained as missing in the fixture")}${metric("TREATMENTS × GENOTYPES","3 × 2","One plot per combination in each block")}</div>
<div class="split">${panel("01 / EXPERIMENTAL GEOGRAPHY","Plot atlas",`<div class="inline-head"><p>Explore the synthetic field layout.</p><span class="pill">24 plots</span></div>${map()}<div class="legend">${treatments.map((t,i)=>`<span><i style="background:${["#c9c09c","#9eb783","#789873"][i]}"></i>${t}</span>`).join("")}</div><p class="caption">Source geometry in a translated local grid. Contours are a cartographic illustration.</p>`)}
<div class="stack">${panel("SELECTED EXPERIMENTAL UNIT","Plot details",plotSelect()+selectedDetails())}
${panel("STUDY RECORD","Field design",details([["Crop","<i>Olea europaea</i>"],["Scenario","Semi-arid · shallow sandy loam"],["Soil depth",data.site[0].depth+" cm"],["Campaigns","2024 / 2025"],["Simulated annual rain",data.site.map(s=>s.precipitation+" mm").join(" / ")]]))}</div></div>
${notice("<strong>Scientific scope.</strong> This synthetic study demonstrates repeated plot sampling and descriptive comparisons. The plot is the experimental unit.")}`;

const filtered = () => data.observations.filter(o=>o.trait===state.trait &&
  (state.treatment==="All treatments" || plotById.get(o.plot)!.treatment===state.treatment) &&
  (state.genotype==="All genotypes" || plotById.get(o.plot)!.genotype===state.genotype));
function phenotype(){
  const rows=filtered(), dates=[...new Set(rows.map(o=>o.date))].sort(), unit=rows[0]?.unit??"";
  const unitIds=[...new Set(rows.map(o=>o.plot))];
  const valid=rows.filter(o=>o.value!==null);
  const series=dates.map(date=>({date,value:mean(valid.filter(o=>o.date===date).map(o=>o.value!))}));
  const distribution=unitIds.map(id=>({id,value:mean(valid.filter(o=>o.plot===id).map(o=>o.value!))})).filter(p=>p.value!==null);
  const min=Math.min(...distribution.map(d=>d.value!)), max=Math.max(...distribution.map(d=>d.value!));
  const pointPlot=distribution.length?`<div class="chart"><svg viewBox="0 0 440 170" role="img" aria-label="Distribution of per-plot temporal means">
    <path d="M48 129H408" stroke="#9aa798"/>${distribution.map((d,i)=>`<circle cx="${48+360*(d.value!-min)/(max-min||1)}" cy="${105-(i%6)*13}" r="5" fill="#438170" opacity=".8"><title>${short(d.id)} · ${number(d.value)} ${esc(unit)}</title></circle>`).join("")}
    <text x="48" y="151">${number(min)}</text><text x="408" y="151" text-anchor="end">${number(max)} ${esc(unit)}</text></svg></div>`:'<p class="empty">No valid plot averages.</p>';
  const pageCount=Math.max(1,Math.ceil(rows.length/state.pageSize));
  return `<div class="filters">${select("Trait","trait",traits,state.trait,title)}${select("Treatment","treatment",["All treatments",...treatments],state.treatment)}${select("Genotype","genotype",["All genotypes",...genotypes],state.genotype)}</div>
  <div class="metrics">${metric("FILTERED ROWS",String(rows.length),"Selected trait and groups")}${metric("EXPERIMENTAL UNITS",String(unitIds.length),"Distinct plots")}${metric("VALID VALUES",String(valid.length),"Repeated observations")}${metric("MISSING VALUES",String(rows.length-valid.length),"Excluded from descriptive means")}</div>
  <div class="split">${panel("01 / TIME SERIES","Sampling trajectory",lineChart(series,unit,"Descriptive means by actual sampling date")+`<p class="caption">Mean of available plot observations per date · ${esc(unit)}. Gaps mark dates with no valid values.</p>`)}
  ${panel("02 / PLOT DISTRIBUTION","Experimental units",pointPlot+'<p class="caption">One dot per plot. Each dot averages the available repeated measurements for that plot. Vertical jitter separates overlapping marks.</p>')}</div>
  ${panel("03 / OBSERVATIONS","Synthetic data table",`<div class="table-actions"><span>${rows.length} filtered rows</span><button id="download" class="primary">Download filtered CSV ↓</button></div>`+table(["Plot","Date","Treatment","Genotype","Value","Unit","Missing reason"],rows.slice(state.tablePage*state.pageSize,(state.tablePage+1)*state.pageSize).map(o=>[short(o.plot),o.date,esc(plotById.get(o.plot)!.treatment),plotById.get(o.plot)!.genotype,o.value===null?'<span class="flag">Missing</span>':String(o.value),esc(o.unit),esc(o.missing)||"—"]))+`<div class="pagination"><button id="prev" ${state.tablePage===0?"disabled":""}>Previous</button><span>Page ${state.tablePage+1} of ${pageCount}</span><button id="next" ${state.tablePage+1>=pageCount?"disabled":""}>Next</button></div>`)}`;
}

const dateButtons=(dates:string[],key:string,current:string)=>`<div class="timeline" aria-label="Acquisition timeline">${dates.map((date,i)=>`<button data-${key}="${i}" aria-pressed="${date===current}">${date}<small>ACQUISITION ${String(i+1).padStart(2,"0")}</small></button>`).join("")}</div>`;
function uav(){
  const thermal=state.uav==="Mixed temperature";
  const rows=data.uav.filter(r=>r.index===state.uav), active=rows.find(r=>r.plot===state.plot&&r.date===state.date)!;
  const unit=thermal?"°C":"dimensionless";
  const colors=new Map(rows.filter(r=>r.date===state.date).map(r=>[r.plot,r.value]));
  const limits=thermal?[22,42]:state.uav==="NDVI"?[0.35,0.8]:[0.1,0.55];
  return `<div class="filters">${select("Product","uav",["NDVI","NDRE","Mixed temperature"],state.uav)}${plotSelect()}</div>
  ${dateButtons(data.dates,"uavdate",state.date)}
  ${thermal?notice("<strong>Mixed canopy-and-ground temperature.</strong> Degrees Celsius from a simulated thermal raster. The mixture cannot isolate canopy temperature or establish physiological stress."):notice("<strong>Whole-plot spectral indices.</strong> The synthetic pixels mix canopy and background. NDVI and NDRE describe reflectance contrast.")}
  <div class="split">${panel("01 / PLOT MAP",thermal?"Mixed thermal product":`${state.uav} across plots`,map(colors,limits)+`<div class="scale"><span>${limits[0]}</span><i></i><span>${limits[1]} ${unit}</span></div><p class="caption">0.5 m source pixels. Colours saturate at the scale endpoints.</p>`)}
  <div class="stack">${panel("ACQUISITION QUALITY",short(state.plot),details([["Date",active.date],["Plot mean",number(active.value,thermal?2:3)+" "+unit],["Valid pixels",active.valid+" / "+active.total],["Coverage",number(active.total?100*active.valid/active.total:null,1)+"%"],["Quality",active.valid===active.total?"Complete pixel coverage":"Partial or missing"],["Origin","Packaged synthetic UAV fixture"]]))}
  ${panel("02 / SELECTED PLOT","Temporal comparison",lineChart(rows.filter(r=>r.plot===state.plot),unit,`${state.uav} across four acquisition dates`)+'<p class="caption">Per-pixel values averaged inside each plot. Pixel counts describe coverage.</p>')}</div></div>`;
}
function satellite(){
  const scene=acquisitions[state.scene], resolution=state.satellite==="NDVI"?10:20;
  const summarize=(i:number,plot=selected())=>{
    const candidates=pixels(i,state.satellite).filter(c=>contains(plot.ring,c.cx,c.cy));
    const available=candidates.filter(c=>c.classification!==0);
    const valid=available.filter(c=>!state.mask||eligible(c.classification));
    return {total:candidates.length, valid:valid.length, value:mean(valid.map(c=>c.value)),
      quality:!candidates.length?"No pixel centre":!valid.length?"Masked / missing":valid.length<candidates.length?"Partial coverage":!state.mask&&valid.some(c=>!eligible(c.classification))?"Unmasked cloud / shadow":"Sparse native sampling"};
  };
  const active=summarize(state.scene);
  const colors=new Map(data.plots.map(p=>[p.id,summarize(state.scene,p).value]));
  const nearest=data.uav.find(r=>r.index===state.satellite&&r.plot===state.plot&&r.date.slice(0,7)===scene.date.slice(0,7));
  return `<div class="filters">${select("Index","satellite",["NDVI","NDRE"],state.satellite)}${plotSelect()}<label class="check"><input id="mask" type="checkbox" ${state.mask?"checked":""}> Apply SCL mask</label></div>
  ${dateButtons(acquisitions.map(a=>a.date),"scene",scene.date)}
  ${notice("<strong>Illustrative synthetic scenes.</strong> S01 plots are approximately 150 m². A 20 m pixel covers 400 m², and even 10 m pixels may mix several surfaces. Plot-level inference may be unreliable.")}
  <div class="split">${panel("01 / SCENE FOOTPRINT",`Native ${resolution} m sampling`,map(colors,[0,.65],state.scene)+
  '<div class="legend"><span><i style="background:#719a65"></i> Illustrative valid sampling</span><span><i class="hatch"></i> Missing or masked</span><span><i class="outline"></i> Synthetic scene footprint</span></div>')}
  <div class="stack">${panel("SCENE METADATA",scene.date,details([["Scene cloud cover",scene.cloud+"% · illustrative"],["Index bands",state.satellite==="NDVI"?"B08 / B04 · 10 m":"B8A / B05 · 20 m"],["Selected plot",short(state.plot)],["Valid / candidate centres",active.valid+" / "+active.total],["Valid-pixel fraction",active.total?number(100*active.valid/active.total,0)+"%":"—"],["Plot index",number(active.value)],["Quality",active.quality]]))}
  ${panel("QUALITY / SCL","Scene classification",`<p class="caption">The model keeps SCL classes 4 and 5, excludes shadow and clouds when masking is on, and always excludes NoData. Scene cloud cover is separate from plot-level valid-pixel fraction.</p><div class="class-list">${Object.entries(scl).map(([n,l])=>`<span><b>${n}</b> ${l}</span>`).join("")}</div>`)}</div></div>
  <div class="split">${panel("02 / ACQUISITION SERIES","Plot timeline",lineChart(acquisitions.map((a,i)=>({date:a.date,value:summarize(i).value})),"dimensionless","Illustrative Sentinel-2 plot index by date"))}
  ${panel("03 / CROSS-SENSOR CONTEXT","Satellite and UAV",table(["Source","Date","Native scale","Index"],[["Illustrative Sentinel-2",scene.date,resolution+" m",number(active.value)],["Packaged synthetic UAV",nearest?.date??"—","0.5 m",number(nearest?.value??null)]])+'<p class="caption">Separate dates, bands, supports and origins. Displayed side by side without resampling, harmonization or agreement claims.</p>')}</div>`;
}
function structure(){
  const a=state.angle*Math.PI/180, b=state.tilt*Math.PI/180;
  const vertices=data.mesh.vertices.map(([x,y,z])=>{
    x-=.5;y-=.5;z-=.5;
    const xx=x*Math.cos(a)-y*Math.sin(a), yy=x*Math.sin(a)+y*Math.cos(a);
    return [205+xx*136,134+(yy*Math.sin(b)-z*Math.cos(b))*136,yy*Math.cos(b)+z*Math.sin(b)];
  });
  const faces=data.mesh.faces.map(f=>({f,z:mean(f.map(i=>vertices[i][2]))!})).sort((a,b)=>a.z-b.z);
  return `<div class="split">${panel("01 / STATIC GEOMETRY VIEWER","Synthetic reference mesh",`<div class="mesh"><svg viewBox="0 0 410 270" role="img" aria-label="Rotated triangulated unit box">
  ${Array.from({length:10},(_,i)=>`<path d="M30 ${145+i*12}H380 M${i*42-65} 267l95-122" stroke="#92a987" opacity=".28"/>`).join("")}
  ${faces.map(({f},i)=>`<polygon points="${f.map(v=>vertices[v].slice(0,2).join(",")).join(" ")}" fill="${i%2?"#8aaf80":"#a6bd8a"}" stroke="#244f46" stroke-width="1.7"/>`).join("")}</svg></div>
  <div class="filters"><label>Azimuth<input id="angle" type="range" min="0" max="360" value="${state.angle}"></label><label>Elevation<input id="tilt" type="range" min="0" max="90" value="${state.tilt}"></label></div>`)}
  ${panel("FIXTURE / DESCRIPTORS","Geometry record",details([["Origin","Packaged synthetic unit-box OBJ"],["Vertices",String(data.mesh.vertices.length)],["Triangle faces",String(data.mesh.faces.length)],["Extent","1 × 1 × 1 fixture units"]])+notice("Browser rotation uses a prepared mesh. Geometry uploads, LiDAR processing and biological interpretation require the full application and an appropriate scientific protocol."))}</div>`;
}
function guide(){
  return `<div class="split">${panel("SCIENTIFIC ATLAS","About this demonstration",`<p>NatureWise Research is an independent scientific platform initiated and developed by Raquel Martínez-Peña. This public demonstration uses synthetic fixtures to explore the structure of a research workflow.</p>
  <p>All interactions run in your browser. CSV downloads contain the current filtered synthetic observations. The full application provides authenticated project workspaces, persistent storage and server-side processing.</p>
  ${table(["Workspace","Demonstrated workflow"],[["Studies","Inspect an experimental design and select plot geometries"],["Phenotyping","Filter repeated observations, inspect means and download CSV"],["UAV","Browse plot summaries of multispectral and mixed thermal raster fixtures"],["Sentinel-2","Explore illustrative scenes, native grids, SCL masks and sparse coverage"],["3D Structure","Rotate a prepared reference mesh"]])}
  <p>Full application inputs include plot geometries, measurement tables, scientific raster products and supported point-cloud or mesh formats. Its analysis outputs require study-specific validation.</p>`)}
  ${panel("DATA ORIGIN","Public provenance",`<dl class="details">${Object.entries(provenance.assets).map(([k,v])=>`<div><dt>${esc(title(k))}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl><button id="manifest" class="primary">Download provenance JSON ↓</button>`)}</div>`;
}
const headings={
  studies:["FIELD STUDIES","S01 · Semi-arid olive grove","An experimental atlas of genotype and ground-cover management across two synthetic growing seasons."],
  phenotyping:["PLOT OBSERVATIONS","Phenotyping explorer","Explore repeated trait measurements and descriptive distributions at the plot level."],
  uav:["NEAR-FIELD REMOTE SENSING","UAV Imagery","Four packaged synthetic acquisitions with whole-plot spectral and mixed thermal summaries."],
  satellite:["ORBITAL OBSERVATION","Satellite / Sentinel-2","Explore native pixels, scene quality and the spatial limits of coarse-resolution plot summaries."],
  structure:["STRUCTURAL PHENOTYPING","3D Structure","Inspect a prepared synthetic reference mesh in an interactive local viewer."],
  guide:["REFERENCE / METHODS","User Guide","Explore the demonstration workflows, fixture origins and scientific limits."],
};
const views={studies:overview,phenotyping:phenotype,uav,satellite,structure,guide};
function render(focus?:string){
  const current=page(), [k,h,d]=headings[current];
  root.innerHTML=`<a class="skip" href="#content">Skip to content</a>
  <aside class="sidebar"><a class="brand" href="#studies"><span class="brand-icon">${symbol}</span><span>NatureWise<small>RESEARCH</small></span></a>
  <div class="nav-label">SCIENTIFIC ATLAS</div><nav aria-label="Research workspaces">${pages.map(([id,label,path],i)=>`<a href="#${id}" ${current===id?'aria-current="page"':""}>${icon(path)}<span>${label}</span><small>0${i+1}</small></a>`).join("")}</nav>
  <div class="side-foot"><div>${dot()} S01 / OLIVE RESEARCH</div><small>Independent scientific platform<br>Raquel Martínez-Peña</small></div></aside>
  <div class="workspace"><header class="top"><span>SCIENTIFIC ATLAS <b>/</b> ${pages.find(p=>p[0]===current)![1]}</span><strong>${dot()} PUBLIC DEMO · SYNTHETIC DATA</strong></header>
  <main id="content" tabindex="-1"><section class="hero"><div class="eyebrow">${k} <span></span> S01_OLI_ARIDO</div><h1>${h}</h1><p>${d}</p><span class="hero-mark" aria-hidden="true">${symbol}</span></section>
  ${views[current]()}<footer><strong>NatureWise Research</strong><span>Interactive static demonstration · synthetic data</span><a href="#guide">Methods & provenance ↗</a></footer></main></div>`;
  if(focus) document.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
}
function download(name:string,text:string,type:string){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
root.addEventListener("click",event=>{
  const target=(event.target as Element).closest<HTMLElement>("[data-plot],[data-uavdate],[data-scene],#download,#manifest,#prev,#next,.skip");
  if(!target)return;
  if(target.classList.contains("skip")){event.preventDefault();document.querySelector<HTMLElement>("#content")?.focus();return;}
  if(target.dataset.plot){state.plot=target.dataset.plot;render(`[data-plot="${state.plot}"]`);}
  else if(target.dataset.uavdate){state.date=data.dates[Number(target.dataset.uavdate)];render(`[data-uavdate="${target.dataset.uavdate}"]`);}
  else if(target.dataset.scene){state.scene=Number(target.dataset.scene);render(`[data-scene="${target.dataset.scene}"]`);}
  else if(target.id==="prev"||target.id==="next"){state.tablePage+=target.id==="prev"?-1:1;render("#"+target.id);}
  else if(target.id==="manifest")download("naturewise-synthetic-provenance.json",JSON.stringify(provenance,null,2),"application/json");
  else if(target.id==="download"){
    const header=["experimental_unit","sampling_date","trait","treatment","genotype","unit","value","missing_reason","synthetic"];
    download("S01-synthetic-filtered.csv",csv([header,...filtered().map(o=>[o.plot,o.date,o.trait,plotById.get(o.plot)!.treatment,plotById.get(o.plot)!.genotype,o.unit,o.value,o.missing,true])]),"text/csv;charset=utf-8");
  }
});
root.addEventListener("keydown",e=>{
  const plot=(e.target as Element).closest<SVGElement>("[data-plot]");
  if(plot&&(e.key==="Enter"||e.key===" ")){e.preventDefault();state.plot=plot.dataset.plot!;render(`[data-plot="${state.plot}"]`);}
});
root.addEventListener("change",e=>{
  const input=e.target as HTMLInputElement|HTMLSelectElement;
  switch(input.id){
    case "plot": case "trait": case "treatment": case "genotype": case "uav": case "satellite":
      state[input.id]=input.value;state.tablePage=0;break;
    case "mask": state.mask=(input as HTMLInputElement).checked;break;
    case "angle": case "tilt": state[input.id]=Number(input.value);break;
    default:return;
  }
  render("#"+input.id);
});
window.addEventListener("hashchange",()=>{render("#content");window.scrollTo(0,0);});
render();
