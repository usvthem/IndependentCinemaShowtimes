import indy from "../indy.js";
/* Chiswick Cinema: same platform as Regent Street. The programme page shows one day, so the "now playing" list is read too. */
export default c=>indy(c,[c.listUrl,new URL("/now-playing",c.listUrl).href,new URL("/coming-soon",c.listUrl).href]);
