import {envFiles} from "./scrapers/env.js";
import express from "express";
import fs from "node:fs";
import {scrapeAll} from "./scrapers/index.js";
import {yearFor,lookupYears,yearsBusy} from "./scrapers/enrich.js";
console.log(process.env.TMDB_API_KEY?"TMDB key found (release years on), from: "+envFiles.join(", "):"No TMDB key found: release years will be limited. See the README to add one.");
const cinemas=JSON.parse(fs.readFileSync(new URL("./cinemas.json",import.meta.url)));
const DIR=process.env.DATA_DIR||"data",FILE=`${DIR}/showtimes.json`,TTL=30*60*1000;
/* What we know: showtimes per cinema, and how each cinema's last scrape went. Kept on disk so a restart
   shows the last results straight away while a fresh scrape runs in the background. */
let rowsBy={},status={},updated=0,loading=false,saveTimer=null;
try{({rowsBy,status,updated}=JSON.parse(fs.readFileSync(FILE,"utf8")))}catch{}
{const known=new Set(cinemas.map(c=>c.id));for(const k of Object.keys(rowsBy))if(!known.has(k))delete rowsBy[k];for(const k of Object.keys(status))if(!known.has(k))delete status[k]} // forget cinemas that were removed
const saveSoon=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify({rowsBy,status,updated}))}catch{}},2000)};
async function refresh(){
  if(loading)return;
  loading=true;
  try{
    await scrapeAll(cinemas,{onCinema:(c,r,st)=>{
      status[c.id]={...st,at:Date.now()};
      if(r.length||!rowsBy[c.id])rowsBy[c.id]=r; // a failed run keeps the previous showtimes
      lookupYears(rowsBy[c.id].filter(x=>!x.year).map(x=>x.film));
      saveSoon();
    }});
    updated=Date.now();saveSoon();
    console.log("scraped",Object.values(rowsBy).reduce((n,r)=>n+r.length,0),"showtimes");
  }catch(e){console.error(e)}
  loading=false;
}
const norm=t=>String(t).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const app=express();
app.get("/showtimes.json",(q,s)=>s.status(404).end()); // `npm start` uses the live API, never a built file
app.use(express.static(new URL("./public",import.meta.url).pathname));
app.get("/api/cinemas",(q,s)=>s.json(cinemas.map(({skip,samples,listUrl,browser,...c})=>({...c,unavailable:!!skip})))); // unavailable = we cannot read its listings
app.get("/api/showtimes",(q,s)=>{
  const ids=String(q.query.cinemas||"").split(",").filter(Boolean),d=String(q.query.date||"");
  const rows=(ids.length?ids:Object.keys(rowsBy)).flatMap(i=>rowsBy[i]||[]).filter(r=>r.date===d).map(r=>r.year?r:{...r,year:yearFor(r.film)});
  rows.sort((a,b)=>a.time.localeCompare(b.time));
  s.json({rows,pending:ids.filter(i=>!status[i]),updated,yearsBusy:yearsBusy()});
});
/* First date (from a given day on) with a screening of a film in the chosen cinemas. */
app.get("/api/next-date",(q,s)=>{
  const ids=String(q.query.cinemas||"").split(",").filter(Boolean),from=String(q.query.from||""),f=norm(String(q.query.film||"").trim());
  let best=null;
  if(f)for(const i of ids.length?ids:Object.keys(rowsBy))for(const r of rowsBy[i]||[])
    if(r.date>=from&&(best===null||r.date<best)&&norm(r.film).includes(f))best=r.date;
  s.json({date:best});
});
/* Which films still have no release year, per cinema: open http://localhost:3000/api/missing-years */
app.get("/api/missing-years",(q,s)=>{
  const missing={};
  for(const [id,rows] of Object.entries(rowsBy)){const t=[...new Set(rows.filter(r=>!r.year&&!yearFor(r.film)).map(r=>r.film))];if(t.length)missing[id]=t}
  s.json({tmdbKeySet:!!process.env.TMDB_API_KEY,lookingUp:yearsBusy(),missing});
});
app.get("/api/health",(q,s)=>s.json({loading,updated,cinemas:status}));
refresh();setInterval(refresh,TTL);
app.listen(process.env.PORT||3000,()=>console.log("http://localhost:"+(process.env.PORT||3000)));
