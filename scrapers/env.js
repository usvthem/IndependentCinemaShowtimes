import fs from "node:fs";
import os from "node:os";
/* Reads KEY=value lines (e.g. TMDB_API_KEY=...) from a .env file in the project folder, and from
   ~/.indie-showtimes.env in your home folder. The home-folder copy survives replacing the project folder. */
export const envFiles=[];
for(const file of [new URL("../.env",import.meta.url),`${os.homedir()}/.indie-showtimes.env`]){
  try{
    for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
      const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if(m&&!line.trim().startsWith("#")&&m[2]&&process.env[m[1]]===undefined)process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");
    }
    envFiles.push(String(file.pathname||file));
  }catch{}
}
