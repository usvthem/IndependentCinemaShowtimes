import * as cheerio from "cheerio";
import {getPage,rowAt,parseTime,niceTitle} from "../util.js";
/* Deptford Cinema: a Squarespace calendar, built by JavaScript (so it needs the browser). One page per month.
   Cells with an event hold "Sun 29", a 24-hour time and a title like "STALKER (1979) - Sci-Fi Sundays".
   Reads this month and the next two. The venue changes from screening to screening; it is on each event page. */
const MONTHS=["january","february","march","april","may","june","july","august","september","october","november","december"];
export default async function(c){
  const base=c.listUrl.replace(/([?&])month=[^&]*&?/,"$1").replace(/[?&]$/,"");
  const now=new Date(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date())+"T00:00:00Z");
  const out=[],seen=new Set();
  for(let i=0;i<3;i++){
    const m=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+i,1));
    const url=`${base}${base.includes("?")?"&":"?"}month=${String(m.getUTCMonth()+1).padStart(2,"0")}-${m.getUTCFullYear()}`;
    let $;try{$=cheerio.load(await getPage(c,url))}catch(e){if(i===0)throw e;continue}
    const head=$(".yui3-calendar-header-label").first().text().trim().toLowerCase().match(/([a-z]+)\s+(\d{4})/);
    const mon=head?MONTHS.indexOf(head[1]):m.getUTCMonth(),yr=head?+head[2]:m.getUTCFullYear();
    if(mon<0)continue;
    $("td.has-event").each((_,td)=>{
      const day=+$(td).find(".marker-daynum").first().text().trim();
      if(!day)return;
      const date=`${yr}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      $(td).find("ul.itemlist li.item a.item-link").each((_,a)=>{
        const link=$(a),time=parseTime(link.find(".item-time--24hr").text().replace(/\u202f|\u00a0/g," "));
        const raw=link.find(".item-title").text().replace(/\s+/g," ").trim();
        if(!time||!raw)return;
        // "STALKER (1979) - Sci-Fi Sundays" -> title, year; the series name is dropped
        const t=raw.match(/^(.*?)\s*\((\d{4})\)\s*(?:[-\u2013\u2014]\s*.*)?$/),title=niceTitle(t?t[1]:raw);
        const key=title+date+time;if(seen.has(key))return;seen.add(key);
        out.push(rowAt(c,title,date,time,link.attr("href"),t?+t[2]:undefined));
      });
    });
  }
  return out;
}
