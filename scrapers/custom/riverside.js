import * as cheerio from "cheerio";
import {getPage,getPlain,rowAt,pmap} from "../util.js";
/* Riverside Studios: the programme lists events; each event page carries a hash that a small data call
   turns into its dates, times and seat-booking links. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl));
  const events=[...new Set($('a[href*="/whats-on/"]').map((_,a)=>new URL($(a).attr("href"),c.listUrl).href).get())]
    .filter(u=>new URL(u).pathname.replace(/\/$/,"")!=="/whats-on");
  const lists=await pmap(events,4,async url=>{
    const out=[];
    try{
      const p=cheerio.load(await getPlain(c,url));
      const hash=p("#event-info").attr("data-hash"),title=p("h1").first().text().trim();
      if(!hash||!title)return out;
      const j=JSON.parse(await getPlain(c,`https://riversidestudios.co.uk/ajax/event_performances/${hash}/`,{"x-requested-with":"XMLHttpRequest"}));
      const s=cheerio.load(j.sidebar||"");
      s(".sidebar-selected-date-times").each((_,d)=>{
        const day=s(d).attr("data-key");
        s(d).find(".performance.sidebar-time").each((_,t)=>{
          const m=s(t).text().trim().match(/^(\d{1,2}):(\d{2})/);
          if(day&&m)out.push(rowAt(c,title,day,`${m[1].padStart(2,"0")}:${m[2]}`,s(t).attr("data-href")||url));
        });
      });
    }catch{}
    return out;
  });
  return lists.flat();
}
