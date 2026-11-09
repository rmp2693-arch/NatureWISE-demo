"""Offline fixture export. Takes an explicitly selected synthetic examples directory."""
import csv
import hashlib
import io
import json
import sys
from pathlib import Path
from zipfile import ZipFile

import numpy as np
from rasterio.features import geometry_mask
from rasterio.io import MemoryFile
from rasterio.warp import transform_geom

examples = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / "src"
sources = {}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read(zip_file, name):
    data = zip_file.read(name)
    sources[f"{Path(zip_file.filename).name}/{name}"] = digest(data)
    return data

def rows(data):
    return list(csv.DictReader(io.StringIO(data.decode("utf-8-sig"))))

site = "S01_OLI_ARIDO"
prefix = "NatureWise_geodatos_SINTETICOS/"
dates = ["2024-05-15", "2024-07-15", "2025-05-15", "2025-07-15"]
with ZipFile(examples / "NatureWise_dataset_SINTETICO_CSV.zip") as z:
    obs = rows(read(z, f"naturewise_core_{site}.csv"))
    plots = [r for r in rows(read(z, "plots.csv")) if r["site_id"] == site]
    metadata = [r for r in rows(read(z, "sites.csv")) if r["site_id"] == site]
assert len(plots) == 24 and len(obs) == 1920
assert all(r["synthetic"].lower() == "true" for r in obs + plots)
assert all(r["data_origin"] == "SYNTHETIC" and r["is_real_field_site"].lower() == "false" for r in metadata)
assert sum(not r["value"] for r in obs) == 7
assert {r["experimental_unit"] for r in obs} == {r["plot_id"] for r in plots}
observations = [
    dict(plot=r["experimental_unit"], date=r["sampling_date"], trait=r["variable"],
         unit=r["unit"], value=float(r["value"]) if r["value"] else None,
         missing=r["missing_reason"])
    for r in obs
]

with ZipFile(examples / "NatureWise_GEODATOS_SINTETICOS_COMPLETO.zip") as z:
    geo = json.loads(read(z, prefix + f"geojson/plots/{site}_plots.geojson"))
    bound = json.loads(read(z, prefix + f"geojson/sites/{site}_boundary.geojson"))
    def projected(feature):
        return transform_geom("EPSG:4326", "EPSG:25830", feature["geometry"])

    geoms = {f["properties"]["plot_id"]: projected(f) for f in geo["features"]}
    boundary = projected(bound["features"][0] if "features" in bound else bound)
    assert set(geoms) == {r["plot_id"] for r in plots}
    ring = boundary["coordinates"][0]
    origin_x = min(x for x, y in ring)
    origin_y = min(y for x, y in ring)
    def local(geom):
        return [[round(x - origin_x, 3), round(y - origin_y, 3)] for x, y in geom["coordinates"][0]]

    refs = rows(read(z, prefix + "metadata/SYNTHETIC_expected_plot_means_from_uav.csv"))
    reference = {(r["plot_id"], r["sampling_date"]): r for r in refs if r["site_id"] == site}
    uav = []
    for date in dates:
        base = prefix + f"uav/{site}/{date}/"
        meta = json.loads(read(z, base + "metadata.json"))
        assert meta["synthetic"] and meta["acquired_on"] == date
        assert meta["band_order"] == ["B02", "B04", "B05", "B08", "B8A"]
        for product, name in [("spectral", "SYNTHETIC_multispectral_5band_COG.tif"),
                              ("thermal", "SYNTHETIC_thermal_K_x100.tif")]:
            with MemoryFile(read(z, base + name)) as mem, mem.open(driver="GTiff") as ds:
                assert ds.crs.to_epsg() == 25830 and ds.res == (0.5, 0.5)
                bands = ds.read(masked=True).astype("float64").filled(np.nan)
                if product == "spectral":
                    red, edge, nir = bands[1:4] * 0.0001
                    with np.errstate(divide="ignore", invalid="ignore"):
                        surfaces = {"NDVI": (nir-red)/(nir+red), "NDRE": (nir-edge)/(nir+edge)}
                else:
                    surfaces = {"Mixed temperature": bands[0] * 0.01 - 273.15}
                for plot, geom in geoms.items():
                    inside = geometry_mask([geom], out_shape=ds.shape, transform=ds.transform, invert=True)
                    for index, surface in surfaces.items():
                        valid = surface[inside & np.isfinite(surface)]
                        value = float(np.mean(valid)) if len(valid) else None
                        ref = reference[plot, date]
                        if index != "NDRE":
                            expected = ref["reference_uav_ndvi_mean" if index == "NDVI" else "reference_thermal_degC_mean"]
                            assert value is not None and abs(value - float(expected)) <= (0.000001 if index == "NDVI" else 0.00002)
                        uav.append(dict(date=date, plot=plot, index=index, value=value,
                                        valid=len(valid), total=int(inside.sum())))
    public_plots = [
        dict(id=r["plot_id"], block=r["block_id"].split("_")[-1], treatment=r["treatment"],
             genotype=r["genotype"], sampleArea=int(r["sample_area_m2"]), ring=local(geoms[r["plot_id"]]))
        for r in plots
    ]

mesh = examples / "structural" / "SYNTHETIC-box.obj"
sources["structural/SYNTHETIC-box.obj"] = digest(mesh.read_bytes())
assert mesh.read_text().startswith("# SYNTHETIC")
vertices, faces = [], []
for line in mesh.read_text().splitlines():
    tag, *values = line.split()
    if tag == "v":
        vertices.append(list(map(float, values)))
    if tag == "f":
        faces.append([int(i) - 1 for i in values])
data = dict(synthetic=True, plots=public_plots, observations=observations,
            boundary=local(boundary), uav=uav, dates=dates,
            site=[dict(year=int(r["year"]), precipitation=int(r["annual_precip_mm"]),
                       depth=int(r["soil_depth_cm"])) for r in metadata],
            mesh=dict(vertices=vertices, faces=faces))
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
(out / "fixtures.json").write_bytes(payload.encode())
manifest = dict(label="PUBLIC DEMO · SYNTHETIC DATA", payload_sha256=digest(payload.encode()),
                sources_sha256=sources, assets={
    "observations": "S01 core rows; exact numeric values, units and missing reasons retained. Plot metadata joined by experimental unit.",
    "map": "S01 polygons and site boundary projected to metres and translated to a local origin. Geographic location omitted. Background texture is diagrammatic.",
    "uav": "0.5 m raster pixel centres inside each polygon. NDVI=(B08-B04)/(B08+B04); NDRE=(B08-B05)/(B08+B05). Mask invalid pixels; mean of per-pixel ratios. Mixed temperature is DN*0.01-273.15. NDVI and thermal means checked against packaged known answers.",
    "satellite": "Illustrative synthetic native grids, spectra and SCL classes generated in src/satellite.ts. No Copernicus observations or harmonization.",
    "mesh": "Vertex and triangle geometry transcribed from packaged synthetic unit-box OBJ."
})
(out / "provenance.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
