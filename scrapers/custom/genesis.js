import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* Genesis: each film block repeats its times for desktop and mobile, so only the desktop copy is read. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  $("div.grid.grid-cols-10").each((_,el)=>{
    const f=$(el),a=f.find("h1 a").first(),title=a.text();
    if(!title.trim())return;
    f.find('div[class*="md:block"]').first().children("div").each((_,d)=>{
      const day=parseDay($(d).contents().filter((_,n)=>n.type==="text").text());
      if(!day)return;
      $(d).find("a.perfButton").each((_,b)=>{
        const t=parseTime($(b).text());
        if(t)out.push(rowAt(c,title,day,t,$(b).attr("href")||a.attr("href")));
      });
    });
  });
  return out;
}
