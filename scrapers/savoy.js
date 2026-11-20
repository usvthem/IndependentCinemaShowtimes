import {getPage,rowAt} from "./util.js";
/* Cinemas on the Savoy Systems booking platform (Rio, Lexi, Phoenix) embed their whole programme
   as a JSON object in the page ("var Events = {...}"). */
function extractObject(t,from){
  let i=t.indexOf("{",from),depth=0,str=false,esc=false;
  for(let k=i;k<t.length;k++){
    const ch=t[k];
    if(str){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch==='"')str=false}
    else if(ch==='"')str=true;else if(ch==="{")depth++;else if(ch==="}"&&--depth===0)return t.slice(i,k+1);
  }
  return null;
}
const nice=t=>t===t.toUpperCase()&&/[A-Z]{3}/.test(t)?t.toLowerCase().replace(/(^|[\s(\-:'])([a-z])/g,(m,a,b)=>a+b.toUpperCase()):t;
export default async function savoy(c){
  const html=await getPage(c,c.listUrl),at=html.indexOf("var Events");
  if(at<0)throw new Error("no embedded Events data found");
  const json=extractObject(html,at);if(!json)throw new Error("could not read Events data");
  const out=[];
  for(const e of JSON.parse(json).Events||[]){
    const title=nice(String(e.Title||"").replace(/\u00a0/g," ").trim()),year=/^\d{4}$/.test(e.Year)?+e.Year:undefined;
    for(const p of e.Performances||[]){
      const t=String(p.StartTime||"").padStart(4,"0");
      if(!title||!p.StartDate||!/^\d{4}$/.test(t))continue;
      out.push(rowAt(c,title,p.StartDate,`${t.slice(0,2)}:${t.slice(2)}`,new URL(p.URL,e.URL).href,year));
    }
  }
  return out;
}
