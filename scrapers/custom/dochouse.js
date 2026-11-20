import * as cheerio from "cheerio";
import {getPage,mapLimit,rowAt,parseDay,parseTime} from "../util.js";
/* Bertha DocHouse: the What's On page is a grid of film cards with no times. Each film's own page lists its
   screenings (date, time, and a Curzon booking link, once for desktop and once for tablet layout). */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl));
  const films=new Map();
  $(".standard-card-item").each((_,el)=>{
    const a=$(el).find('a[href*="/event/"]').first(),href=a.attr("href"),title=$(el).find("h3").first().text().replace(/\s+/g," ").trim();
    if(href&&title)films.set(new URL(href,c.listUrl).href,title);
  });
  const out=[];
  await mapLimit([...films],4,async([url,title])=>{
    try{
      const p=cheerio.load(await getPage(c,url)),seen=new Set();
      p("a.trigger-pop").each((_,a)=>{
        const link=p(a),href=link.attr("href"),date=parseDay(link.find(".date").text()),time=parseTime(link.find(".time").text());
        if(!href||!date||!time)return;
        const key=date+time+href;if(seen.has(key))return;seen.add(key);
        out.push(rowAt(c,title,date,time,href));
      });
    }catch{}  // one film page failing should not lose the rest
  });
  return out;
}
