import * as cheerio from "cheerio";
import {getPage,rowAt,parseDM,parseTime,niceTitle} from "../util.js";
/* The Nickel: plain text cards. Each has a day/month like "Saturday 14/11", Bar and Film times, and a booking link.
   Double bills list their showtimes before "Bar"; otherwise the Film time is the screening. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[],seen=new Set();
  $('a[href*="/screening/"]').each((_,a)=>{
    const link=$(a),href=link.attr("href"),box=link.find("section").length?link.find("section").first():link.closest("section");
    if(!box.length||seen.has(href))return;
    seen.add(href);
    const text=box.text().replace(/\s+/g," ");
    const d=text.match(/(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\s+(\d{1,2})\s*\/\s*(\d{1,2})(.*)/);
    if(!d)return;
    const day=parseDM(+d[1],+d[2]);
    let times=[...d[3].split(/Bar(?![a-z])/)[0].matchAll(/\d{1,2}(?:[:.]\d{2})?\s*[ap]m/gi)].map(m=>parseTime(m[0]));
    if(!times.length){const f=d[3].match(/Film\s*(\d{1,2}(?:[:.]\d{2})?\s*[ap]m)/i);if(f)times=[parseTime(f[1])]}
    const title=niceTitle(box.find("p").first().text()||(box.find("img").attr("alt")||"").replace(/^Poster for /,""));
    const y=box.find("p.italic").first().text().match(/\(\s*(\d{4})/);
    const fmt=(d[3].match(/(16mm|35mm|70mm|8mm|super 8|VHS|DCP|Blu-?ray|Digital)/i)||[])[1];
    for(const t of new Set(times.filter(Boolean)))if(title){const r=rowAt(c,title,day,t,href,y?+y[1]:undefined);if(fmt)r.fmt=fmt;out.push(r)}
  });
  return out;
}
