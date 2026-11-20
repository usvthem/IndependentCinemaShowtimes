import fs from "node:fs";
import {mapLimit} from "./util.js";
/* Release years. Cinemas that don't give one are looked up on TMDB (needs TMDB_API_KEY) and remembered
   in data/years.json, so each title is only ever looked up once. */
const DIR=process.env.DATA_DIR||"data",FILE=`${DIR}/years.json`,WEEK=7*864e5;
let cache=new Map();
try{cache=new Map(Object.entries(JSON.parse(fs.readFileSync(FILE,"utf8"))))}catch{}
const key=t=>String(t).toLowerCase().replace(/\s+/g," ").trim();
const norm=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
/* A year written in the title itself, e.g. "SCREAMPLAY (1984) + Q&A", wins over any lookup. */
export const yearFor=t=>{const m=String(t).match(/\(((?:19|20)\d{2})\)/);return m?+m[1]:cache.get(key(t))?.y||undefined};
const EVENTISH=/(screening|club|preview|presents?|presented|retrospective|festival|spotlight|jazz on screen|cinema|seniors?|relaxed|parent|baby|family|category|bar trash|tribute|premiere|restoration|member|classroom|silent film|experiments|young barbican|preschool|behind the scenes|ffc|liaf|lpff|sla \d|lkff|mubi)/i;
/* Titles to try, best first: "Relaxed Screening: Godzilla Minus Zero" -> that, then "Godzilla Minus Zero". */
export function candidates(title){
  const t=String(title).replace(/\([^)]*\)/g," ").replace(/\s+/g," ").trim()
    .replace(/\s+[+|\u2013\u2014]\s+.*$/,"").replace(/\s+-\s+.*$/,"")
    .replace(/\s+(presented by|presents?|in collaboration with)\b.*$/i,"").replace(/[:\s]+Q(&|\+|and)A.*$/i,"")
    .replace(/\s+(U|PG|12A?|15|18|R18)$/,"").trim();
  const out=[t],i=t.indexOf(": ");
  if(i>0&&EVENTISH.test(t.slice(0,i)))out.push(t.slice(i+2).trim());
  const poss=t.replace(/^(?:[A-Z][\w.-]*\s+){0,2}[A-Z][\w.-]*[\u2019']s\s+/,"");
  if(poss!==t&&poss.length>=8)out.push(poss);
  return [...new Set(out.filter(Boolean))];
}
export function applyYears(rows){for(const r of rows)if(!r.year){const y=yearFor(r.film);if(y)r.year=y}}
function save(){try{fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE,JSON.stringify(Object.fromEntries(cache)))}catch{}}
async function search(q,token){
  const url="https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-GB&query="+encodeURIComponent(q)+(token.length<=40?"&api_key="+token:"");
  const r=await fetch(url,{headers:token.length>40?{Authorization:"Bearer "+token}:{},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error("TMDB "+r.status);
  return ((await r.json()).results||[]).slice(0,10).filter(x=>x.release_date);
}
/* Only an exact title match counts, so a wrong film's year is never used. The most popular match wins. */
async function tmdb(title,token){
  for(const q of candidates(title)){
    const same=(await search(q,token)).filter(x=>norm(x.title)===norm(q)||norm(x.original_title)===norm(q)).sort((a,b)=>b.popularity-a.popularity);
    if(same[0])return +same[0].release_date.slice(0,4);
  }
  return null;
}
let chain=Promise.resolve(),busy=0;
export const yearsBusy=()=>busy>0;
/* Queue a lookup for titles with no known year; safe to call often. Returns a promise. */
export function lookupYears(titles){
  const token=process.env.TMDB_API_KEY;if(!token)return chain;
  /* Misses from older matching rules (no version mark) are retried, as are week-old misses. */
  const todo=[...new Set(titles)].filter(t=>{const e=cache.get(key(t));return !e||(!e.y&&(e.v!==2||Date.now()-e.at>WEEK))});
  if(!todo.length)return chain;
  busy++;
  chain=chain.then(async()=>{
    await mapLimit(todo,4,async t=>{try{cache.set(key(t),{y:await tmdb(t,token),at:Date.now(),v:2})}catch{}});
    save();
  }).catch(()=>{}).finally(()=>{busy--});
  return chain;
}
