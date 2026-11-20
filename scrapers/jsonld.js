/* Generic scraper: reads schema.org Event / ScreeningEvent data embedded in the page.
   Works for any cinema site that publishes it; others need a file in scrapers/custom/. */
import * as cheerio from "cheerio";
import {getPage,row} from "./util.js";
const flat=x=>Array.isArray(x)?x.flatMap(flat):x&&x["@graph"]?flat(x["@graph"]):x?[x]:[];
export default async function jsonld(c){
  const out=[];
  for(const u of [c.listUrl,...(c.extraUrls||[])]){
    const $=cheerio.load(await getPage(c,u));
    $('script[type="application/ld+json"]').each((_,el)=>{
      let j;try{j=JSON.parse($(el).text())}catch{return}
      for(const e of flat(j)){
        if(![].concat(e["@type"]||[]).some(t=>/Event$/.test(t))||!e.startDate||!e.name)continue;
        const d=new Date(e.startDate);if(isNaN(d))continue;
        out.push(row(c,e.name,d,e.url));
      }
    });
  }
  return out;
}
