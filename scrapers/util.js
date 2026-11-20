export const UA="Mozilla/5.0 (compatible; IndieShowtimesBot/1.0)";
let browser=null;
/* Plain HTTP fetch: fast, but only sees what the server sends. */
export async function getHtml(url,headers={}){
  const r=await fetch(url,{headers:{"user-agent":UA,...headers},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(url+" returned "+r.status);
  /* Trust the bytes, not the header: some sites claim an old encoding but send UTF-8, others send Windows-1252
     with no label. Strict UTF-8 first; if the text isn't valid UTF-8, it's Windows-1252. */
  const buf=Buffer.from(await r.arrayBuffer());
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch{return new TextDecoder("windows-1252").decode(buf)}

}
/* Real Chromium via Playwright: sees pages that build their listings with JavaScript. */
export async function getRendered(url,xhr){
  const {chromium}=await import("playwright");
  browser??=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  const page=await browser.newPage({userAgent:UA});
  if(xhr)page.on("response",async r=>{
    try{if(/json/.test(r.headers()["content-type"]||"")&&r.status()<400)xhr.push({page:url,url:r.url(),body:(await r.text()).slice(0,3e6)})}catch{}
  });
  try{
    await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    await page.waitForLoadState("networkidle",{timeout:10000}).catch(()=>{}); // some sites never go quiet
    /* Dismiss a cookie banner, but only buttons inside a consent-looking box, so other buttons are never clicked.
       If the click reloads or navigates the page, go back to the page we wanted. */
    const before=page.url();
    const box=page.locator('[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="onetrust" i],[id*="gdpr" i]');
    for(const name of [/accept/i,/agree/i,/allow all/i]){
      const b=box.getByRole("button",{name}).first();
      if(await b.count()){await b.click({timeout:2000}).catch(()=>{});break}
    }
    await page.waitForTimeout(1000);
    if(page.url()!==before){
      await page.goto(before,{waitUntil:"domcontentloaded",timeout:45000});
      await page.waitForLoadState("networkidle",{timeout:10000}).catch(()=>{});
    }
    return await page.content();
  }finally{await page.close()}
}
/* Use the browser for cinemas flagged "browser": true in cinemas.json. */
function fixture(c,url){
  const d=process.env.FIXTURE_DIR,f=`${d}/${c.id}__${url.replace(/[^a-z0-9]+/gi,"_")}.html`;
  if(fs.existsSync(f))return fs.readFileSync(f,"utf8");
  if(url===c.listUrl)return fs.readFileSync(`${d}/${c.id}.html`,"utf8");
  throw new Error("no fixture for "+url);
}
/* Testing: FIXTURE_DIR=dir makes getPage read dir/<cinema id>.html instead of the network. */
import fs from "node:fs";
export const getPage=async(c,url)=>process.env.FIXTURE_DIR?fixture(c,url):c.browser?getRendered(url):getHtml(url);
/* Plain HTTP (never the browser), still reading from FIXTURE_DIR when testing. For data feeds and simple pages. */
export const getPlain=async(c,url,headers)=>process.env.FIXTURE_DIR?fixture(c,url):getHtml(url,headers);
/* Run fn over items with at most n at once. */
export async function mapLimit(items,n,fn){
  const out=new Array(items.length);let i=0;
  await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const k=i++;out[k]=await fn(items[k],k)}}));
  return out;
}
/* Plain fetch first (fast); the browser only if that fails or the page doesn't look like the real thing. */
export async function getSmart(c,url,looksRight){
  try{const h=await getPlain(c,url);if(looksRight(h))return h}catch{}
  return getPage({...c,browser:true},url);
}
export async function closeBrowser(){await browser?.close();browser=null}
/* Build one showtime row. `d` is a Date; date/time are reported in London time. */
export function row(c,film,d,url){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(d).map(x=>[x.type,x.value]));
  return {cinema:c.id,film:tidy(film),date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,url:new URL(url||c.listUrl,c.listUrl).href};
}

const NAMED={amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",rsquo:"\u2019",lsquo:"\u2018",ldquo:"\u201c",rdquo:"\u201d",ndash:"\u2013",mdash:"\u2014",hellip:"\u2026"};
/* "Q&amp;A" -> "Q&A", "&#8217;" -> an apostrophe. */
export const decodeEntities=t=>String(t).replace(/&(#x?[0-9a-f]+|[a-z]+);/gi,(m,e)=>{
  if(e[0]==="#"){const n=e[1].toLowerCase()==="x"?parseInt(e.slice(2),16):parseInt(e.slice(1),10);try{return String.fromCodePoint(n)}catch{return m}}
  return NAMED[e.toLowerCase()]??m;
});
const tidy=t=>decodeEntities(t).replace(/\s+/g," ").trim();
const MONTHS=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const pad=n=>String(n).padStart(2,"0");
const todayLondon=()=>new Date(new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London"}).format(new Date())+"T00:00:00Z");
/* Parse "Friday 13th November", "Sat 21 Nov" or "13 November 2026" into YYYY-MM-DD.
   With no year given, picks the nearest sensible one (listings never reach far into the past). */
export function parseDay(text){
  const m=String(text).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?(?:\s+(\d{4}))?/);
  if(!m)return null;
  const mon=MONTHS.indexOf(m[2].slice(0,3).toLowerCase());if(mon<0)return null;
  const day=+m[1],now=todayLondon();let y=m[3]?+m[3]:now.getUTCFullYear();
  if(!m[3]&&Date.UTC(y,mon,day)<now.getTime()-60*864e5)y++;
  return `${y}-${pad(mon+1)}-${pad(day)}`;
}
/* Parse "12:15 pm", "7.30pm" or "18:00" into HH:MM. */
export function parseTime(text){
  for(const m of String(text).matchAll(/(\d{1,2})(?:[:.](\d{2}))?\s*([ap]m)?/gi)){
    if(!m[2]&&!m[3])continue;
    let h=+m[1];const ap=(m[3]||"").toLowerCase();
    if(ap==="pm"&&h<12)h+=12;if(ap==="am"&&h===12)h=0;
    if(h>23||(m[2]&&+m[2]>59))continue;
    return `${pad(h)}:${m[2]||"00"}`;
  }
  return null;
}
/* Day and month as numbers (day first, as in 14/11) into YYYY-MM-DD, picking the nearest sensible year. */
export function parseDM(d,m){
  const now=todayLondon();let y=now.getUTCFullYear();
  if(Date.UTC(y,m-1,d)<now.getTime()-60*864e5)y++;
  return `${y}-${pad(m)}-${pad(d)}`;
}
/* Tidy ALL-CAPS titles into Title Case, leaving mixed-case titles alone. */
export function niceTitle(t){
  t=String(t).trim();
  if(t!==t.toUpperCase()||!/[A-Z]{3}/.test(t))return t;
  const small=/^(of|the|and|a|an|in|on|at|to|for|with|vs)$/,keep=/^(vhs|uk|usa|tv|dvd|dj|ii|iii|iv)$/;
  return t.toLowerCase().replace(/[^\s]+/g,(w,i)=>{
    const core=w.replace(/[^a-z0-9&]/g,"");
    if(/[\d&]/.test(core)||keep.test(core))return w.toUpperCase();
    return !i||!small.test(w)?w.replace(/(^|[(\-:'\u2019"\/])([a-z])/g,(m,x,y)=>x+y.toUpperCase()):w;
  });
}
/* A showtime row when the page already gives date and time as text. */
export const rowAt=(c,film,date,time,url,year)=>({cinema:c.id,film:tidy(film),date,time,url:new URL(url||c.listUrl,c.listUrl).href,...(year?{year}:{})});

/* Run fn over items with at most `limit` running at once; results keep their order. */
export async function pmap(items,limit,fn){
  const out=new Array(items.length);let i=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(i<items.length){const k=i++;out[k]=await fn(items[k],k)}
  }));
  return out;
}
