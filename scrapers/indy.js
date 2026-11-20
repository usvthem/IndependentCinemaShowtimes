import * as cheerio from "cheerio";
import {getPage,rowAt,parseDay,parseTime,pmap} from "./util.js";
/* Cinemas built on the same booking platform (Regent Street, Chiswick): each film's own page lists every date,
   with a time button per screening. */
export async function readFilm(c,url){
  const out=[];
  let p;try{p=cheerio.load(await getPage(c,url))}catch{return out}
  let title=p("h1").first().text().trim();
  p('script[type="application/ld+json"]').each((_,s)=>{try{const g=JSON.parse(p(s).text())["@graph"]||[];const m=g.find(x=>x["@type"]==="Movie");if(m?.name)title=m.name}catch{}});
  const all=p("button.showing");if(!all.length||!title)return out;
  let box=all.first();const hasDate=b=>/\w{3}, \w+ \d{1,2}, \d{4}/.test(b.text());
  while(box.parent().length&&(box.find("button.showing").length<all.length||!hasDate(box)))box=box.parent();
  let day=null;
  const walk=n=>{
    if(n.type==="text"){const d=/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,\s+\w+\s+\d{1,2},\s+\d{4}/.exec(n.data);if(d)day=parseDay(d[0].replace(/^\w+,\s+/,"").replace(/(\w+)\s+(\d+),\s+(\d{4})/,"$2 $1 $3"));}
    else if(n.name==="button"&&p(n).hasClass("showing")){const t=parseTime(p(n).attr("aria-label")||p(n).text());if(day&&t)out.push(rowAt(c,title,day,t,url));}
    else (n.children||[]).forEach(walk);
  };
  box.each((_,n)=>walk(n));
  return out;
}
/* Film links are gathered from one or more list pages; a list page that can't be loaded is skipped. */
export default async function indy(c,listPages=[c.listUrl]){
  const links=new Set();
  for(const lp of listPages){
    try{const $=cheerio.load(await getPage(c,lp));$('a[href*="/movie/"]').each((_,a)=>links.add(new URL($(a).attr("href"),lp).href))}catch{}
  }
  return (await pmap([...links],4,url=>readFilm(c,url))).flat();
}
