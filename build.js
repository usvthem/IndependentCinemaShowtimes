/* Scrapes every cinema once and writes public/showtimes.json, which the page reads directly (no server needed).
   This is what the daily GitHub Action runs. Locally:  npm run build   (or  npm run build -- kiln deptford  for just those).
   A cinema that fails keeps its previous showtimes, so one broken scraper never empties the site. */
import {envFiles} from "./scrapers/env.js";
import fs from "node:fs";
import {scrapeAll} from "./scrapers/index.js";
import {lookupYears,applyYears} from "./scrapers/enrich.js";
const OUT="public/showtimes.json";
const all=JSON.parse(fs.readFileSync(new URL("./cinemas.json",import.meta.url)));
const only=process.argv.slice(2);
const todo=only.length?all.filter(c=>only.includes(c.id)):all;
if(only.length&&!todo.length){console.error("No cinema matches: "+only.join(", "));process.exit(1)}
console.log(process.env.TMDB_API_KEY?"TMDB key found: release years on.":"No TMDB key: release years will be limited.");

let prev={rows:[],status:{}};
try{prev=JSON.parse(fs.readFileSync(OUT,"utf8"))}catch{}
const iso=d=>d.toISOString().slice(0,10);
const yesterday=iso(new Date(Date.now()-864e5));
const keepOld=id=>(prev.rows||[]).filter(r=>r.cinema===id&&r.date>=yesterday);

const {status,rows}=await scrapeAll(todo);
const byId={};
for(const r of rows)(byId[r.cinema]??=[]).push(r);
const final={},st={},now=Date.now();
for(const c of all){
  if(!todo.includes(c)){final[c.id]=keepOld(c.id);st[c.id]=prev.status?.[c.id]||{ok:false,count:0,note:"Not scraped this time"};continue}
  const s=status[c.id]||{ok:false,count:0};
  if(s.ok&&(byId[c.id]||[]).length){final[c.id]=byId[c.id];st[c.id]={...s,at:now}}
  else{ // failed or empty: keep what we had
    const old=keepOld(c.id);
    final[c.id]=old;
    st[c.id]={...s,at:now,...(old.length?{kept:old.length}:{})};
    if(!c.skip)console.warn("FAILED",c.id,s.error||s.note||"");
  }
}
/* Release years: look up any still missing on TMDB (remembered in data/years.json), then fill them in. */
const flat=Object.values(final).flat();
await lookupYears(flat.filter(r=>!r.year).map(r=>r.film));
applyYears(flat);
flat.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));

/* The list the page uses. A cinema with no showtimes at all (skipped, or never worked) shows as 'showtimes unavailable'. */
const cinemas=all.map(({skip,samples,listUrl,browser,...c})=>({...c,unavailable:!!skip||!final[c.id].length}));
fs.mkdirSync("public",{recursive:true});
fs.writeFileSync(OUT,JSON.stringify({updated:now,cinemas,rows:flat,status:st}));

const ok=all.filter(c=>!c.skip&&st[c.id].ok),bad=all.filter(c=>!c.skip&&!st[c.id].ok);
const lines=[`${flat.length} showtimes from ${ok.length} of ${ok.length+bad.length} cinemas.`,
  ...(bad.length?["","Not working this run:",...bad.map(c=>`- ${c.id}: ${st[c.id].error||st[c.id].note||"no showtimes"}${st[c.id].kept?` (kept ${st[c.id].kept} earlier showtimes)`:""}`)]:[])];
console.log(lines.join("\n"));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,"## Showtimes update\n"+lines.join("\n")+"\n");
process.exit(0);
