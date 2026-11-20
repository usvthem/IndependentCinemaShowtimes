import {getPage,rowAt} from "../util.js";
/* Electric Cinema: one data file lists both cinemas' films and screenings.
   Portobello is cinema 603 and White City is 602. */
const WHICH={electric:"603",electricwc:"602"};
export default async function(c){
  const j=JSON.parse(await getPage(c,c.listUrl)),out=[];
  for(const s of Object.values(j.screenings||{})){
    if(String(s.cinema)!==WHICH[c.id]||!s.d||!s.t)continue;
    const f=j.films?.[s.film];
    if(f?.title)out.push(rowAt(c,f.title,s.d,s.t,s.link||f.link));
  }
  return out;
}
