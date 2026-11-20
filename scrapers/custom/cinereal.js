import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* Cine Real: each programme block has a title, a list of "Friday 20 November 2026 · 7:30pm" dates and one booking link. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  $(".programme-details").each((_,el)=>{
    const b=$(el),title=b.find("h2").first().text().trim(),link=b.find("a.button-link").first().attr("href");
    if(!title)return;
    b.find("li").each((_,li)=>{const d=parseDay($(li).text()),t=parseTime($(li).text().replace(/^.*·/,""));if(d&&t)out.push(rowAt(c,title,d,t,link))});
  });
  return out;
}
