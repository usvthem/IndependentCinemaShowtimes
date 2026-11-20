import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime} from "../util.js";
/* David Lean Cinema: the home page is a list of individual screenings (a few featured cards, then a "What's on" grid),
   each with a date and time and a link to the screening's page. */
export default async function(c){
  const $=cheerio.load(await getPage(c,c.listUrl)),out=[],seen=new Set();
  const NOT_TITLE=/^(what.?s on|more info|book now|play trailer)/i;
  const titleOf=box=>{
    const h=box.find("h2,h3").map((_,x)=>$(x).text().trim()).get().find(t=>t&&!NOT_TITLE.test(t));
    return h||box.find('a[href*="/event/"]').map((_,x)=>$(x).text().trim()).get().find(t=>t&&!NOT_TITLE.test(t))||"";
  };
  $(".event-date").each((_,el)=>{
    // the smallest surrounding block that has this screening's own title and no other screening's date
    let box=$(el),title="";
    for(let i=0;i<8&&!title;i++){box=box.parent();if(box.find(".event-date").length>1)break;title=titleOf(box)}
    if(!title)return;
    const text=$(el).text().replace(/\s+/g," "),day=parseDay(text),t=parseTime(text.replace(/^.*?\bat\b/,""));
    const link=box.find("a[href]").filter((_,a)=>/book now|more info/i.test($(a).text())).first().attr("href");
    const y=box.find(".event-meta p").first().text().trim().match(/^((?:19|20)\d{2})$/);
    const key=title+day+t;
    if(day&&t&&!seen.has(key)){seen.add(key);out.push(rowAt(c,title,day,t,link,y?+y[1]:undefined))}
  });
  return out;
}
