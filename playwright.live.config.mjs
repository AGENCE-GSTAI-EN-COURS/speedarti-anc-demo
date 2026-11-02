import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:"./qa-live",timeout:45000,retries:2,reporter:"list",
  use:{baseURL:"https://agence-gstai-en-cours.github.io/speedarti-anc-demo/",screenshot:"only-on-failure",trace:"retain-on-failure"},
  projects:[
    {name:"desktop",use:{...devices["Desktop Chrome"]}},
    {name:"mobile",use:{...devices["Pixel 7"]}}
  ]
});
