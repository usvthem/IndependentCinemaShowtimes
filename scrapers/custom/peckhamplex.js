import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime,pmap} from "../util.js";
/* Peckhamplex: the "out now" page links to each film; each film page lists its dates, with a booking link per time. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl));
  const films=[...new Set($('a[href*="/film/"]').map((_,a)=>new URL($(a).attr("href"),c.listUrl).href).get())];
  return (await pmap(films,5,async url=>{
    const out=[];
    let p;try{p=cheerio.load(await getPage(c,url))}catch{return out}
    const title=p("h1").map((_,h)=>p(h).text().trim()).get().filter(t=>t&&!/^Peckhamplex$/i.test(t)).pop();
    if(!title)return out;
    p(".date-wrapper").each((_,w)=>{
      const wrap=p(w),day=parseDay(wrap.clone().find(".btn-group").remove().end().text());
      if(!day)return;
      wrap.find("a.btn").each((_,a)=>{const t=parseTime(p(a).find("time").text()||p(a).text());if(t)out.push(rowAt(c,title,day,t,p(a).attr("href")||url))});
    });
    return out;
  })).flat();
}
