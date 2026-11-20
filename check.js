import "./scrapers/env.js";
import fs from "node:fs";
import {scrapeAll} from "./scrapers/index.js";
const {status,rows}=await scrapeAll(JSON.parse(fs.readFileSync("cinemas.json")));
for(const [id,s] of Object.entries(status))console.log(s.ok?"OK  ":(s.note&&!s.error&&s.count===0&&!/No showtimes/.test(s.note)?"SKIP":"FAIL"),id.padEnd(12),String(s.count??"").padEnd(4),s.error||s.note||"");
console.log("\n"+rows.length+" showtimes in total");
