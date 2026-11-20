import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* Kiln Cinema: the Cinema Listings page shows one week at a time ("Wednesday 18th November" with a time and title
   per screening, certificate in brackets). Other weeks load through a calendar widget, so this reads the week shown.
   The calendar has no per-screening links, so each row links to the film's own page when its title matches one
   in the "Now Showing" / "Coming Soon" lists, and to the listings page otherwise. */
const norm=t=>t.toLowerCase().replace(/\s*\((?:u|pg|12a?|15|18|r18)\)\s*$/,"").replace(/[^a-z0-9]+/g," ").trim();
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[],seen=new Set();
  const films=new Map();
  $('a[href*="/whats-on/"]').each((_,a)=>{
    const href=$(a).attr("href"),t=$(a).text().replace(/\s+/g," ").trim();
    if(t&&/\/whats-on\/[^/]+\/?$/.test(href)&&!films.has(norm(t)))films.set(norm(t),new URL(href,c.listUrl).href);
  });
  $(".c-booking-single").each((_,day)=>{
    const date=parseDay($(day).find(".c-film-booking__date").first().text());
    if(!date)return;
    $(day).find("li").each((_,li)=>{
      const time=parseTime($(li).find(".c-film-booking__time").first().text()),raw=$(li).find(".c-film-booking__title").first().text().replace(/\s+/g," ").trim();
      if(!time||!raw)return;
      const title=raw.replace(/\s*\((?:U|PG|12A?|15|18|R18)\)\s*$/,"");
      const key=title+date+time;if(seen.has(key))return;seen.add(key);
      out.push(rowAt(c,title,date,time,films.get(norm(raw))||c.listUrl));
    });
  });
  return out;
}
