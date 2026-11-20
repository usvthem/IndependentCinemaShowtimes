# Independent Cinema Showtimes: London

    npm install      # also downloads Chromium (about 150 MB)
    npm run check    # scrapes every cinema once and shows which ones worked
    npm start        # http://localhost:3000

- `cinemas.json`: the cinemas, their coordinates and the page to scrape (`listUrl`; add `extraUrls` for more pages).
- The generic scraper (`scrapers/jsonld.js`) reads schema.org event data from the page. For a cinema that doesn't publish it, add `scrapers/custom/<id>.js` (see `_example.js.txt`); it overrides the generic one.
- Release years (for the "older / repertory" filter) come from a "(1984)" in the title, or from TMDB if you set `TMDB_API_KEY` (a free read-access token). Films with no known year are hidden when a Recent/Older filter is on.
- Data refreshes every 30 minutes. `/api/health` shows per-cinema status.

## Publish for free (GitHub Pages)
The page can run with no server: a GitHub Action scrapes every cinema twice a day, saves `public/showtimes.json`, and publishes `public/` to GitHub Pages. The page reads that file and does the filtering in the browser.

1. Create a **public** repository on GitHub and push this folder to it (`.gitignore` already leaves out `.env`, `node_modules`, `dumps` and `data/showtimes.json`). Copy your local `data/years.json` in too, if you have one: it saves re-looking-up release years.
2. Repo **Settings > Pages > Source: GitHub Actions**.
3. Repo **Settings > Secrets and variables > Actions > New repository secret**: name `TMDB_API_KEY`, value your key (optional, but gives release years).
4. **Actions** tab > "Update showtimes and publish" > **Run workflow**. It takes a few minutes. The run's summary page lists any cinema that failed (for example if a site blocks GitHub's servers); a failed cinema keeps its previous showtimes, and one that has never worked shows as "showtimes unavailable".
5. Your site is at `https://<your-username>.github.io/<repo-name>/`.

After that it updates itself at 06:00 and 14:00 UTC (edit the `cron` lines in `.github/workflows/update.yml`). If the workflow ever stops running, press Run workflow; GitHub pauses schedules on repositories with no activity for 60 days. The page warns visitors when the data is more than a day and a half old.
If the commit step fails with a permissions error: Settings > Actions > General > Workflow permissions > Read and write.

**Cinemas that block GitHub's servers** (Close-Up, Regent Street) work from a home computer. To refresh them, in the project folder run:

    git pull
    npm run refresh
    git add public/showtimes.json data/years.json
    git commit -m "Refresh Close-Up and Regent"
    git push

Their showtimes are then kept by every automatic run until they pass (a cinema that fails keeps its earlier showtimes). Press Run workflow to publish straight away. Doing this about once a week is enough.

Locally: `npm run build` does the same scrape into `public/showtimes.json` (`npm run build -- kiln deptford` for just those). `npm start` always uses the live server instead, even if that file exists.

## Deploy with a server instead (Render, a VPS)
New Web Service from your repo: build `npm install`, start `npm start`. Add `TMDB_API_KEY` under Environment. Chromium needs about 2 GB of memory.

## Writing scrapers
    npm run dump    # saves every cinema page to ./dumps, with dumps/_summary.txt
Zip the dumps folder and send it to Claude to get custom scrapers written.

## Credits
Where each London cinema keeps its listings was learned from the open-source cinescrapers project (github.com/Joeboy/cinescrapers), which powers filmhose.uk. It has no licence file, so none of its code is used here.

`"browser": true` in cinemas.json makes a cinema load in Chromium instead of plain HTTP.

`"skip": "reason"` in cinemas.json keeps a cinema in the list but unscraped; it shows as 'showtimes unavailable'. Delete the line once its scraper works. `"nomadic": true` keeps a cinema out of Near me, since it has no fixed venue (Deptford Cinema).

`"samples": [urls]` in cinemas.json tells `npm run dump` exactly which detail pages to save for a cinema. Scrapers in scrapers/custom/ are tested against saved pages: `FIXTURE_DIR=<dumps folder> node check.js`.

## Speed and release years
- The server keeps the latest showtimes in `data/showtimes.json`, so a restart shows them straight away while a fresh scrape runs in the background. Results appear cinema by cinema as each one finishes.
- `"browser": "auto"` in cinemas.json tries a plain fetch first and only opens the browser if that finds nothing.
- Missing release years are looked up on TMDB and remembered in `data/years.json`. Get a free key at themoviedb.org (Settings > API), then save it once in a file called `.env` in this folder: `echo 'TMDB_API_KEY=your_key' > .env` (or copy `.env.example` to `.env` and paste the key in). It is picked up on every `npm start`.

## Where the TMDB key lives
Save it once in your home folder so replacing this project folder never loses it:
`echo 'TMDB_API_KEY=your_key' > ~/.indie-showtimes.env`
(A `.env` file inside the project folder works too. Files starting with a dot are hidden: use `ls -a` in Terminal, or press Cmd+Shift+. in Finder.)
