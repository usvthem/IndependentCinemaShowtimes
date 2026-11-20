import {getPlain,rowAt} from "../util.js";
/* The Cinema Museum sells its tickets on Ticketlab, whose event feed is plain JSON (the museum's own site often
   returns an error). Dates are London time. Museum tours and quiz nights are skipped. Titles like
   "The Gothique Film Society presents Dracula (1973) and They Have Changed Their Face (1971)" become one row per
   film, with the year split out; "on 35mm" becomes the format. */
const SKIP=/^museum tour\b|\bquiz night\b/i;
export default async function(c){
  const j=JSON.parse(await getPlain(c,c.listUrl,{accept:"application/json"})),out=[];
  for(const e of j.events||[]){
    const m=String(e.date||"").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    const name=String(e.name||"").replace(/\s+/g," ").replace(/\s+\d{1,2}[.:]\d{2}$/,"").trim(); // some titles end with the session time
    if(!m||!name||SKIP.test(name)||e.cancellation_reason||/cancel/i.test(e.status_type||""))continue;
    const fmt=(name.match(/\bon (8mm|16mm|35mm|70mm)\b/i)||[])[1];
    const rest=name.replace(/^.*?\bpresents\s+(?=.*\(\d{4}\))/i,"");   // drop "<society> presents"
    const films=[...rest.matchAll(/([^()]+?)\s*\((\d{4})\)/g)].map(x=>({t:x[1].replace(/^\s*(?:and|plus|\+|&|,)\s+/i,"").trim(),y:+x[2]})).filter(x=>x.t);
    for(const f of films.length?films:[{t:name}]){
      const r=rowAt(c,f.t,m[1],m[2],e.url,f.y);
      if(fmt)r.fmt=fmt.toLowerCase();
      out.push(r);
    }
  }
  return out;
}
