# url-extract-pipeline

**AI-powered web scraper.** Paste a URL, pick a schema (or write your own in YAML), and the pipeline fetches the page, cleans the HTML, and hands it to Gemini 2.5 Flash with a typed extraction tool. Get structured JSON and Excel back.

Live demo → [url-extract.vercel.app](https://url-extract.vercel.app)

Built as a companion to [pdf-extract-pipeline](https://github.com/joshobuilds/pdf-extract-pipeline). Same mental model — drop in unstructured data, declare what you want, get a spreadsheet back.

---

## What it does

1. **Fetches the URL** server-side with a realistic User-Agent and a 15s timeout.
2. **Cleans the HTML** — strips scripts, styles, comments, and low-signal attributes; resolves relative URLs to absolute; caps at ~800KB.
3. **Extracts with Gemini** — the schema compiles to a Gemini function-calling tool, so the model is forced to return fields that match your types (string, number, integer, boolean, date, array, enum).
4. **Two modes** — `single` returns one record for page-level summaries (article, product detail). `list` returns an array of records, one per repeating item on a listing page.
5. **Exports cleanly** — JSON for pipelines, Excel with a styled header for humans.

---

## Built-in presets

| Preset | Mode | What it extracts |
|---|---|---|
| Book listing (books.toscrape.com) | list | title, price, rating, stock, detail URL |
| Quotes (quotes.toscrape.com) | list | text, author, tags |
| Hacker News front page | list | rank, title, url, points, comments, author |
| Generic product listing | list | name, price, currency, rating, product URL |
| Article / blog post | single | title, author, date, summary, topics |

See `lib/presets.ts`. Copy a preset as a starting point for your own schema.

---

## Writing a custom schema

```yaml
name: "My listing"
description: "What this schema covers."
mode: list   # "list" for repeating items, "single" for one-record pages
instructions: |
  - Any extraction rules.
  - Formatting conventions (dates, currency, enums).

fields:
  - name: title
    type: string
    required: true

  - name: price
    type: number

  - name: status
    type: string
    enum: [in_stock, out_of_stock, preorder]

  - name: tags
    type: array
    item_type: string
```

**Field types:** `string`, `number`, `integer`, `boolean`, `date`, `array` (with `item_type`).
**Optional constraints:** `required: true`, `enum: [list, of, values]`, `description: "..."`.

---

## Run locally

```bash
cp .env.example .env.local
# paste your Gemini API key into .env.local

npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Import the repo at https://vercel.com/new.
2. Add an environment variable: `GEMINI_API_KEY` = your Google AI Studio key.
3. (Optional) `PRIMARY_MODEL=gemini-2.5-flash` for production accuracy; defaults to `gemini-2.5-flash-lite` for free-tier demos.

Vercel auto-detects Next.js. Every push to `main` ships.

---

## How it works

- `app/page.tsx` — single-page UI: URL + preset/schema → results table
- `app/api/scrape/route.ts` — server route: fetch → clean → Gemini → JSON
- `app/api/export/route.ts` — streams an `.xlsx` back to the browser
- `lib/fetcher.ts` — fetch with timeout, cheerio-based HTML cleanup
- `lib/schema.ts` — YAML → Gemini tool declaration (handles single vs list mode)
- `lib/extractor.ts` — Gemini call with retries and model fallback
- `lib/excel.ts` — ExcelJS export with styled header

Transient errors (`503`, `429`, overloaded) retry with exponential backoff. If the primary model stays unavailable, the pipeline falls back to `gemini-2.5-flash-lite` and logs the fallback in the result's warnings.

---

## Limits

- Only fetches public pages — no auth, no login-gated content.
- Works best on server-rendered HTML. JavaScript-heavy SPAs that render content client-side will return a mostly empty page.
- Cap: one URL per run, ~800KB of HTML, 60s function budget.
- Respect each site's `robots.txt` and terms of service.

---

## Built by

[joshobuilds](https://github.com/joshobuilds) — scrapers, automations, and AI data pipelines. Python developer on Upwork.

## License

MIT.
