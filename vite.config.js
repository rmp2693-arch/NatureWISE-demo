const base = process.env.DEMO_LEGACY_PAGES === "1" ? "/NatureWISE-demo/" : "/";

export default {
  base,
  publicDir: false,
  build: { sourcemap: false, modulePreload: { polyfill: false } },
};
