export const acquisitions = [
  { date: "2024-05-18", cloud: 9, shift: 1 },
  { date: "2024-07-18", cloud: 34, shift: 5 },
  { date: "2025-05-18", cloud: 14, shift: 8 },
  { date: "2025-07-18", cloud: 55, shift: 12 },
];
export const scl = { 4: "Vegetation", 5: "Bare ground", 3: "Cloud shadow", 8: "Cloud", 9: "Dense cloud", 0: "No data" };
export const footprint = (shift: number) => [[-14+shift,-12],[132+shift,-12],[132+shift,89],[-14+shift,89]];
export function pixels(acquisition: number, index: string) {
  const {shift, cloud} = acquisitions[acquisition];
  const resolution = index === "NDVI" ? 10 : 20;
  const cells = [];
  for (let row=0; row<11; row++) for (let col=0; col<15; col++) {
    const x=shift-13+col*resolution, y=-11+row*resolution;
    const cx=x+resolution/2, cy=y+resolution/2;
    if (cx>132+shift || cy>89) continue;
    const rank=(col*37+row*23+acquisition*19)%100;
    const classification=rank<cloud/2 ? 9 : rank<cloud ? 8 : rank>94 ? 3 : rank>90 ? 0 : rank%3 ? 4 : 5;
    const nir=0.33+((row*7+col*3+acquisition*11)%23)/100;
    const other=index==="NDVI" ? 0.12+rank/1000 : 0.22+rank/1200;
    cells.push({x,y,cx,cy,resolution,classification,value:(nir-other)/(nir+other)});
  }
  return cells;
}
export function contains(ring: number[][], x: number, y: number) {
  let inside=false;
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
export const eligible = (classification: number) => classification===4 || classification===5;
