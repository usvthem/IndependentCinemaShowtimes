import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* Prince Charles Cinema: one block per film; dated headings and time buttons share a list. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  $("div.film_list-outer").each((_,el)=>{
    const f=$(el),a=f.find("a.liveeventtitle").first(),title=a.text();
    if(!title.trim())return;
    const y=f.find(".running-time span").first().text().trim();
    const year=/^\d{4}$/.test(y)?+y:undefined;
    f.find("ul.performance-list-items").each((_,ul)=>{
      let day=null;
      $(ul).children().each((_,ch)=>{
        if(ch.name==="div"&&$(ch).hasClass("heading"))day=parseDay($(ch).text());
        else if(ch.name==="li"&&day){
          const t=parseTime($(ch).find("span.time").first().text());
          if(t)out.push(rowAt(c,title,day,t,$(ch).find("a.film_book_button").attr("href")||a.attr("href"),year));
        }
      });
    });
  });
  return out;
}
