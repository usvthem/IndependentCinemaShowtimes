import * as cheerio from "cheerio";
import {getSmart,mapLimit,rowAt,parseDay,parseTime} from "../util.js";
/* BFI Southbank: its search page takes a date, so each of the next 21 days is requested (four at a time).
   Booking buttons have no direct links, so each showtime links to the film's page. */
const ymd=d=>d.toISOString().slice(0,10);
export default async function(c){
  const start=new Date(),out=[];
  await mapLimit(Array.from({length:21},(_,i)=>i),5,async i=>{
    const day=ymd(new Date(start.getTime()+i*864e5));
    const url=c.listUrl.replace(/search_from=\d{4}-\d{2}-\d{2}/,"search_from="+day).replace(/search_to=\d{4}-\d{2}-\d{2}/,"search_to="+day);
    let $;try{$=cheerio.load(await getSmart(c,url,h=>/result-box|search-results/.test(h)))}catch{return}
    $(".result-box-item").each((_,el)=>{
      const e=$(el);
      if(!/Screen NFT|IMAX|Studio|Southbank/i.test(e.find(".item-venue").text()))return; // skips library sessions
      const a=e.find("a.more-info").first(),when=e.find(".start-date").text().replace(/\s+/g," ");
      const d=parseDay(when),t=parseTime(when.replace(/^.*\d{4}\s+/,"")),title=(a.attr("title")||a.text()).trim();
      if(d&&t&&title)out.push(rowAt(c,title,d,t,a.attr("href")?new URL(a.attr("href"),url).href:c.listUrl));
    });
  });
  return out;
}
