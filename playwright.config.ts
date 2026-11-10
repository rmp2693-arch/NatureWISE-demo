import { defineConfig } from "@playwright/test";

const path = process.env.DEMO_LEGACY_PAGES === "1" ? "/NatureWISE-demo/" : "/";
const localURL = "http://127.0.0.1:4173" + path;
const deployedURL = process.env.DEMO_TEST_URL;
const baseURL = deployedURL ? new URL("./", deployedURL.replace(/\/?$/, "/")).href : localURL;

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  workers: 1,
  use: { baseURL, launchOptions: { executablePath: process.env.CHROMIUM_PATH } },
  webServer: deployedURL ? undefined : {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: localURL,
    reuseExistingServer: false,
  },
});
