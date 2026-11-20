import * as cheerio from "cheerio";
import {getPage,rowAt,parseTime} from "../util.js";
/* Coldharbour Blue: the Screenings page is a slideshow of film cards ("Date: 24/11/26", "Time: 20:00", title with the
   year in brackets). Each card links to its own booking page. The slideshow may repeat a card, so duplicates are dropped. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[],seen=new Set();
  $(".slideshow-slide.movie").each((_,el)=>{
    const card=$(el),a=card.find("a.title-link").first(),raw=a.text().replace(/\s+/g," ").trim();
    const d=card.find(".meta .date").text().match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/),time=parseTime(card.find(".meta .time").text().replace(/Time:/i,""));
    if(!raw||!d||!time)return;
    const yr=+d[3]<100?2000+ +d[3]:+d[3];
    const date=`${yr}-${d[2].padStart(2,"0")}-${d[1].padStart(2,"0")}`;
    const y=raw.match(/\s*\((\d{4})\)\s*$/),title=raw.replace(/\s*\(\d{4}\)\s*$/,"");
    const key=title+date+time;if(seen.has(key))return;seen.add(key);
    out.push(rowAt(c,title,date,time,card.find(".actions a.button-secondary").first().attr("href")||a.attr("href"),y?+y[1]:undefined));
  });
  return out;
}
