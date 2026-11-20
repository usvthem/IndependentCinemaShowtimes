import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* The Garden Cinema: the homepage's A-Z list carries every screening with its booking link. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  $(".films-list__by-title__film").each((_,el)=>{
    const f=$(el),a=f.find(".films-list__by-title__film-title > a").first();
    const title=a.clone().children().remove().end().text();
    if(!title.trim())return;
    const ym=f.find(".films-list__by-title__az-summary").text().match(/[,\/]\s*((?:19|20)\d{2})\b/);
    f.find(".screening-panel__day").each((_,d)=>{
      const day=parseDay($(d).find(".screening-panel__date-title").first().text());
      if(!day)return;
      $(d).find("a.screening").each((_,s)=>{
        const t=parseTime($(s).text());
        if(t)out.push(rowAt(c,title,day,t,$(s).attr("href")||a.attr("href"),ym?+ym[1]:undefined));
      });
    });
  });
  return out;
}
