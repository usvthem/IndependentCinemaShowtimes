import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* ICA: the "next 7 days" page is a run of day headings, each followed by that day's films and times. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  let day=null;
  $(".docket-date, div.item.films").each((_,el)=>{
    const e=$(el);
    if(e.hasClass("docket-date")){day=parseDay(e.text());return}
    if(!day)return;
    const a=e.find("a").first(),
      title=e.find(".title-container .title").not(".season-item").last().contents().filter((_,n)=>n.type==="text").last().text().trim();
    if(!title)return;
    e.find(".time-slot").each((_,t)=>{const tm=parseTime($(t).text());if(tm)out.push(rowAt(c,title,day,tm,a.attr("href")))});
  });
  return out;
}
