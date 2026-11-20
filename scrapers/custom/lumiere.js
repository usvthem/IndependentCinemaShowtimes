import * as cheerio from "cheerio";
import {getPage,getPlain,rowAt,pmap} from "../util.js";
/* Cine Lumiere: the programme page links to each film; every film page has a "More Showings" table
   with a date, time and booking link per screening. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl));
  const films=[...new Set($(".card--film a[href]").map((_,a)=>new URL($(a).attr("href"),c.listUrl).href).get())]
    .filter(u=>/\/cinema\/[^/]+\/?$/.test(new URL(u).pathname));
  const lists=await pmap(films,5,async url=>{
    const out=[];
    try{
      const p=cheerio.load(await getPlain(c,url)),title=p("h1").first().text().trim();
      if(!title)return out;
      const rows=p("#more-dates .desktop tbody tr");
      (rows.length?rows:p("#more-dates tbody tr")).each((_,tr)=>{
        const day=p(tr).find("time.date").attr("datetime"),time=p(tr).find("time.time").attr("datetime");
        if(/^\d{4}-\d{2}-\d{2}$/.test(day||"")&&/^\d{2}:\d{2}$/.test(time||""))
          out.push(rowAt(c,title,day,time,p(tr).find("a[href]").first().attr("href")||url));
      });
    }catch{}
    return out;
  });
  return lists.flat();
}
