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

## Cloudflare Pages

In the Cloudflare dashboard, open **Workers & Pages → Create application → Pages → Connect to Git**. Use a free Pages project and authorize GitHub as `rmp2693-arch`. In the GitHub App installation, choose **Only select repositories** and select `NatureWISE-demo`.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `npm ci && npm run build:cloudflare` |
| Build output directory | `dist` |
| Build environment variables | `NODE_VERSION=24`, `SKIP_DEPENDENCY_INSTALL=1` |

Enable automatic production deployments. The Cloudflare command validates types, runs the fixture tests and checks the contents of the generated artifact before deployment. GitHub Actions also runs the browser suite. GitHub Pages uses the repository subpath via `DEMO_LEGACY_PAGES=1` during the transition.

After the first successful Cloudflare deployment, copy its public HTTPS URL from the dashboard. Run the browser suite with `DEMO_TEST_URL` set to that URL to verify navigation, plots, charts, CSV downloads and mobile layout. Request explicit approval before changing repository visibility. After making the repository private, check the public site in a signed-out browser and verify that a later validated commit automatically produces a successful Cloudflare deployment. The JavaScript and synthetic data delivered to visitors remain inspectable in the browser.

## Public data

The provenance manifest lists source-member SHA-256 hashes and derivations. The packaged S01 core contributes 1,920 observations across 24 experimental plots with seven missing values. UAV NDVI and mixed-temperature means were checked against the supplied reference table. NDRE was calculated from the packaged raster pixels. The Sentinel-2 example is separately generated and illustrative. A prepared synthetic unit-box mesh provides a rotation example. These datasets support software demonstration and descriptive inspection.

`scripts/export-fixtures.py` is the offline reproduction recipe. It takes the path to the original synthetic examples directory and needs NumPy and Rasterio. Browser builds use the reviewed JSON output and need only the dependencies in the npm lockfile.
