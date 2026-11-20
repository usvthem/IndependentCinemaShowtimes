import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* ArtHouse Crouch End: the home page has one tab per day (the first labelled "Today", the rest "Fri 20 Nov").
   Each tab lists films, and each film has a booking button per time that links straight to the Savoy booking page. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[];
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date());
  $("input[name=tabs]").each((_,inp)=>{
    const label=$(inp).next("label"),name=label.text().replace(/\s+/g," ").trim();
    const date=/^today$/i.test(name)?today:parseDay(name);
    const tab=label.next(".tab");
    if(!date||!tab.length)return;
    tab.find(".performance").each((_,p)=>{
      const t=$(p).find(".show-title a").first().clone();
      t.find(".prog-cert").remove();
      const title=t.text().replace(/\s+/g," ").trim();
      if(!title)return;
      $(p).find("a.bookingbutton").each((_,a)=>{
        const time=parseTime($(a).find(".starttime").text()),href=$(a).attr("href");
        if(time&&href)out.push(rowAt(c,title,date,time,href.replace(/^http:/,"https:")));
      });
    });
  });
  return out;
}
