# NatureWise Research Scientific Atlas

**PUBLIC DEMO · SYNTHETIC DATA**

A standalone browser demonstration of NatureWise Research, an independent scientific platform initiated and developed by Raquel Martínez-Peña. Explore the synthetic S01 study, plot observations, prepared UAV summaries, illustrative Sentinel-2 scenes and a reference mesh.

The full platform supports authenticated workspaces and server-side scientific processing. This static demonstration provides interactive inspection and CSV downloads in the browser. Plot geometry is shown in a translated local metre grid.

## Run and verify

Use Node.js 24.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run check:public
npx playwright install chromium
npm run test:browser
```

The Pages workflow verifies the production build under the repository subpath and publishes its static artifact. The workflow requires GitHub Pages to use **GitHub Actions** as its source.

## Public data

The provenance manifest lists source-member SHA-256 hashes and derivations. The packaged S01 core contributes 1,920 observations across 24 experimental plots with seven missing values. UAV NDVI and mixed-temperature means were checked against the supplied reference table. NDRE was calculated from the packaged raster pixels. The Sentinel-2 example is separately generated and illustrative. A prepared synthetic unit-box mesh provides a rotation example. These datasets support software demonstration and descriptive inspection.

`scripts/export-fixtures.py` is the offline reproduction recipe. It takes the path to the original synthetic examples directory and needs NumPy and Rasterio. Browser builds use the reviewed JSON output and need only the dependencies in the npm lockfile.
