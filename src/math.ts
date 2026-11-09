export const mean = (values: number[]) => values.length ? values.reduce((sum,n)=>sum+n,0)/values.length : null;
export const number = (value: number | null, digits=3) => value===null ? "—" : value.toFixed(digits);
export const csvField = (value: unknown) => '"' + String(value ?? "").replaceAll('"','""') + '"';
export const csv = (rows: unknown[][]) => rows.map(row=>row.map(csvField).join(",")).join("\r\n")+"\r\n";
