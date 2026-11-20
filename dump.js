/* Saves each cinema's page (and a couple of its film pages) into ./dumps so scrapers can be written against real HTML.
   Usage: npm run dump            (all cinemas)
          npm run dump -- pcc bfi (just these ids) */
import fs from "node:fs";
import * as cheerio from "cheerio";
import {getPage,getRendered,closeBrowser} from "./scrapers/util.js";
const all=JSON.parse(fs.readFileSync("cinemas.json"));
const want=process.argv.slice(2);
const list=want.length?all.filter(c=>want.includes(c.id)):all;
fs.mkdirSync("dumps",{recursive:true});
const out=[];
const one=async c=>{
  try{
    const xhr=[],get=u=>c.browser?getRendered(u,xhr):getPage(c,u);
    const html=await get(c.listUrl);
    fs.writeFileSync(`dumps/${c.id}.html`,html);
    const $=cheerio.load(html);
    const times=(html.match(/\b\d{1,2}[:.]\d{2}\b/g)||[]).length;
    const host=new URL(c.listUrl).host;
    const abs=[...new Set($("a[href]").map((_,a)=>{try{return new URL($(a).attr("href"),c.listUrl).href.split("#")[0]}catch{return null}}).get().filter(Boolean))];
    const links=abs.filter(h=>/whats-on|what-s-on|film|movie|cinema|programme|calendar|listing|showtime|schedule|event/i.test(h)).slice(0,12);
    const films=c.samples||abs.filter(h=>{const u=new URL(h);return u.host===host&&u.pathname.split("/").filter(Boolean).length>=2&&/film|movie|event|whats-on|programme|article/i.test(u.pathname)&&h!==c.listUrl}).slice(0,2);
    for(const [i,f] of films.entries()){try{fs.writeFileSync(`dumps/${c.id}__film${i+1}.html`,await get(f))}catch{}}
    xhr.forEach((x,i)=>fs.writeFileSync(`dumps/${c.id}__xhr_${i+1}.json`,x.body));
    out.push(`## ${c.id} ${c.listUrl}\nbytes=${html.length} times=${times} ld+json=${$('script[type="application/ld+json"]').length} nextdata=${html.includes("__NEXT_DATA__")}\nsample film pages: ${films.join(" ")}\nlinks:\n  ${links.join("\n  ")}\n${xhr.length?"json responses:\n  "+xhr.map((x,i)=>`${i+1}: ${x.url} (${x.body.length} bytes)`).join("\n  ")+"\n":""}`);
  }catch(e){out.push(`## ${c.id} ${c.listUrl}\nFAILED: ${e.message}\n`)}
};
for(let i=0;i<list.length;i+=3)await Promise.all(list.slice(i,i+3).map(one));
await closeBrowser();
fs.writeFileSync("dumps/_summary.txt",out.join("\n"));
console.log("Done. Zip the 'dumps' folder and send it to Claude.");
