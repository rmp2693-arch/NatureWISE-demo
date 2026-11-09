import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests", testMatch:"*.spec.ts", workers:1,
  use:{baseURL:"http://127.0.0.1:4173/NatureWISE-demo/",launchOptions:{executablePath:process.env.CHROMIUM_PATH}},
  webServer:{command:"npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",url:"http://127.0.0.1:4173/NatureWISE-demo/",reuseExistingServer:false},
});
