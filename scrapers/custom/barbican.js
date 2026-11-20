import * as cheerio from "cheerio";
import {getPage,getSmart,row,pmap} from "../util.js";
/* Barbican: the listing gives film titles and event ids; each event's "performances" page lists its dates. */
export default async function(c){
  const seen=new Map();
  for(let pg=0;pg<8;pg++){
    let $;try{$=cheerio.load(await getPage(c,c.listUrl+(pg?`&page=${pg}`:"")))}catch{break}
    const before=seen.size;
    $("article.listing--event").each((_,el)=>{
      const e=$(el),id=e.find("button[data-saved-event-id]").first().attr("data-saved-event-id");
      const a=e.find("a.search-listing__link").first();
      const title=e.find("button[data-saved-event-notification]").first().attr("data-saved-event-notification")||a.text();
      if(id&&title&&!seen.has(id))seen.set(id,{title:title.trim(),url:new URL(a.attr("href"),c.listUrl).href});
    });
    if(seen.size===before)break; // no new events: end of the list
  }
  const lists=await pmap([...seen],6,async([id,ev])=>{
    const out=[];
    let $;try{$=cheerio.load(await getSmart(c,`https://www.barbican.org.uk/whats-on/event/${id}/performances`,h=>/<time[^>]+datetime/.test(h)))}catch{return out}
    $("time[datetime]").each((_,t)=>{const d=new Date($(t).attr("datetime"));if(!isNaN(d))out.push(row(c,ev.title,d,ev.url));});
    return out;
  });
  return lists.flat();
}
