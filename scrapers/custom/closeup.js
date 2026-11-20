import * as cheerio from "cheerio";
import {getPage,mapLimit,rowAt} from "../util.js";
/* Close-Up's own site sits behind a bot check, but its tickets are sold on Ticketsource, whose listing page and
   event pages are readable. The listing shows each film's next screening; each film's own page lists them all. */
const SITE="https://www.ticketsource.com";
function parseRows($,c,fallbackTitle){
  const out=[];
  $(".eventRow").each((_,el)=>{
    const r=$(el),title=r.find(".eventTitle").first().text().trim()||fallbackTitle;
    const when=(r.find(".dateTime").first().attr("content")||"").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    const book=r.find('a[href*="/booking/"]').first().attr("href")||r.find(".eventTitle a").first().attr("href");
    if(title&&when)out.push(rowAt(c,title,when[1],when[2],book?new URL(book,SITE).href:c.url));
  });
  return out;
}
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl));
  const listing=parseRows($,c);
  const events=[...new Set($(".eventRow .eventTitle a").map((_,a)=>new URL($(a).attr("href"),SITE).href).get())];
  const out=[],gotPage=new Set();
  await mapLimit(events,4,async url=>{
    try{
      const p=cheerio.load(await getPage(c,url)),rows=parseRows(p,c,p("h1").first().text().trim());
      if(rows.length){out.push(...rows);gotPage.add(url)}
    }catch{}
  });
  // a film whose own page could not be read still shows its next screening from the listing
  const titleOf=new Map($(".eventRow").map((_,el)=>[[$(el).find(".eventTitle").first().text().trim(),new URL($(el).find(".eventTitle a").first().attr("href"),SITE).href]]).get());
  for(const r of listing)if(!gotPage.has(titleOf.get(r.film)))out.push(r);
  return out;
}
