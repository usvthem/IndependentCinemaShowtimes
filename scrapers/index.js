import fs from "node:fs";
import jsonld from "./jsonld.js";
import {applyYears} from "./enrich.js";
import {closeBrowser,mapLimit} from "./util.js";
/* Scrape one cinema. "browser":"auto" tries a plain fetch first and uses the browser only if that finds nothing. */
export async function scrapeCinema(c){
  const custom=new URL(`./custom/${c.id}.js`,import.meta.url);
  const fn=fs.existsSync(custom)?(await import(custom.href)).default:jsonld;
  if(c.browser==="auto"){
    try{const r=await fn({...c,browser:false});if(r.length)return r}catch{}
    return fn({...c,browser:true});
  }
  return fn(c);
}
/* Scrape every cinema, a few at a time. onCinema fires as each one finishes, so results can be used straight away. */
export async function scrapeAll(cinemas,{onCinema,concurrency=5}={}){
  const rows=[],status={};
  const order=[...cinemas].sort((a,b)=>(a.browser===true)-(b.browser===true)); // quick ones first
  await mapLimit(order,concurrency,async c=>{
    let r=[],st;
    if(c.skip){status[c.id]={ok:false,count:0,note:c.skip};await onCinema?.(c,r,status[c.id]);return}
    try{
      r=await scrapeCinema(c);
      st=r.length?{ok:true,count:r.length}:{ok:false,count:0,note:"No showtimes found: needs a custom scraper"};
    }catch(e){st={ok:false,error:String(e.message||e)}}
    applyYears(r);status[c.id]=st;rows.push(...r);
    await onCinema?.(c,r,st);
  });
  await closeBrowser();
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  return {rows,status};
}
